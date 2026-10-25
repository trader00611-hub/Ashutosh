#!/usr/bin/env python3
"""
Local (single machine, pure Python) version of spark/movie_analysis.py.
Produces the SAME docs/data/results.json so the dashboard can be tested without a cluster.
No libraries needed - only the Python standard library.

    python local/run_mapreduce_local.py   # optional, adds MapReduce comparison
    python local/analyze_local.py
"""
import csv
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_DIR, "data", "raw", "ml-latest-small")
JSON_OUT = os.path.join(PROJECT_DIR, "docs", "data", "results.json")
MR_RESULT = os.path.join(PROJECT_DIR, "output", "mapreduce_genre_avg.tsv")
MIN_RATINGS = 50
YEAR_RE = re.compile(r"\((\d{4})\)$")


class Agg:
    """Running sum/count, like Spark's avg() + count()."""
    __slots__ = ("total", "count", "movies")

    def __init__(self):
        self.total, self.count, self.movies = 0.0, 0, set()

    def add(self, rating, movie_id=None):
        self.total += rating
        self.count += 1
        if movie_id is not None:
            self.movies.add(movie_id)

    @property
    def avg(self):
        return round(self.total / self.count, 4)


def load_mapreduce_result(path):
    if not os.path.exists(path):
        return []
    out = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            p = line.strip().split("\t")
            if len(p) == 3:
                out.append({"genre": p[0], "avg_rating": round(float(p[1]), 4), "num_ratings": int(p[2])})
    return sorted(out, key=lambda d: d["avg_rating"], reverse=True)


def main():
    ratings_path = os.path.join(DATA_DIR, "ratings.csv")
    movies_path = os.path.join(DATA_DIR, "movies.csv")
    if not os.path.exists(ratings_path):
        sys.exit("Dataset missing. Run data/download_data.ps1 (Windows) or data/download_data.sh (Linux) first.")

    movies = {}
    with open(movies_path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            m = YEAR_RE.search(row["title"].strip())
            movies[int(row["movieId"])] = {
                "title": row["title"], "genres": row["genres"],
                "year": int(m.group(1)) if m else None,
            }

    overall, users = Agg(), defaultdict(Agg)
    genre, year, decade, movie = defaultdict(Agg), defaultdict(Agg), defaultdict(Agg), defaultdict(Agg)
    dist = defaultdict(int)

    with open(ratings_path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            uid, mid, r = int(row["userId"]), int(row["movieId"]), float(row["rating"])
            ry = datetime.fromtimestamp(int(row["timestamp"]), tz=timezone.utc).year
            overall.add(r, mid)
            users[uid].add(r)
            year[ry].add(r)
            dist[r] += 1
            info = movies.get(mid)
            if info is None:
                continue
            movie[mid].add(r)
            if info["year"] is not None:
                decade[info["year"] // 10 * 10].add(r, mid)
            for g in info["genres"].split("|"):
                if g != "(no genres listed)":
                    genre[g].add(r, mid)

    years = list(year)
    summary = {
        "total_ratings": overall.count, "total_users": len(users), "rated_movies": len(overall.movies),
        "avg_rating": overall.avg, "first_rating_year": min(years), "last_rating_year": max(years),
        "total_movies": len(movies), "total_genres": len(genre),
    }

    def movie_row(mid):
        m, a = movies[mid], movie[mid]
        return {"title": m["title"], "year": m["year"], "genres": m["genres"],
                "avg_rating": a.avg, "num_ratings": a.count}

    top_rated = sorted((mid for mid, a in movie.items() if a.count >= MIN_RATINGS),
                       key=lambda mid: (-movie[mid].avg, -movie[mid].count, movies[mid]["title"]))[:15]
    most_rated = sorted(movie, key=lambda mid: (-movie[mid].count, -movie[mid].avg, movies[mid]["title"]))[:15]

    result = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "engine": "Local Python test mode (same logic as Spark job)",
        "min_ratings_for_top": MIN_RATINGS,
        "summary": summary,
        "genre_stats": sorted(({"genre": g, "avg_rating": a.avg, "num_ratings": a.count,
                                "num_movies": len(a.movies)} for g, a in genre.items()),
                              key=lambda d: -d["avg_rating"]),
        "rating_distribution": [{"rating": r, "count": dist[r]} for r in sorted(dist)],
        "ratings_per_year": [{"year": y, "count": year[y].count, "avg_rating": year[y].avg} for y in sorted(year)],
        "decade_stats": [{"decade": d, "num_movies": len(decade[d].movies), "num_ratings": decade[d].count,
                          "avg_rating": decade[d].avg} for d in sorted(decade)],
        "top_rated_movies": [movie_row(m) for m in top_rated],
        "most_rated_movies": [movie_row(m) for m in most_rated],
        "top_users": [{"userId": u, "num_ratings": users[u].count, "avg_rating": users[u].avg}
                      for u in sorted(users, key=lambda u: (-users[u].count, u))[:10]],
        "mapreduce_genre_avg": load_mapreduce_result(MR_RESULT),
    }

    os.makedirs(os.path.dirname(JSON_OUT), exist_ok=True)
    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"Ratings: {summary['total_ratings']:,} | Movies: {summary['total_movies']:,} | "
          f"Users: {summary['total_users']:,} | Avg: {summary['avg_rating']}")
    print("Top 5 genres by avg rating:")
    for g in result["genre_stats"][:5]:
        print(f"  {g['genre']:<15} {g['avg_rating']:.3f}  ({g['num_ratings']:,} ratings)")
    print(f"\nDashboard data written to {JSON_OUT}")


if __name__ == "__main__":
    main()
