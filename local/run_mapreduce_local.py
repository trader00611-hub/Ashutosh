#!/usr/bin/env python3
"""
Simulates Hadoop Streaming on one machine:   cat ratings.csv | mapper.py | sort | reducer.py
Use it to test the MapReduce code before running it on the cluster (works on Windows too).

    python local/run_mapreduce_local.py
"""
import os
import subprocess
import sys

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_DIR, "data", "raw", "ml-latest-small")
MR_DIR = os.path.join(PROJECT_DIR, "mapreduce")
OUT_FILE = os.path.join(PROJECT_DIR, "output", "mapreduce_genre_avg.tsv")


def main():
    ratings = os.path.join(DATA_DIR, "ratings.csv")
    movies = os.path.join(DATA_DIR, "movies.csv")
    if not os.path.exists(ratings):
        sys.exit("Dataset missing. Run data/download_data.ps1 (Windows) or data/download_data.sh (Linux) first.")

    env = dict(os.environ, MOVIES_FILE=movies)

    print("[1/3] MAP     : mapper.py over ratings.csv")
    with open(ratings, "rb") as f:
        mapped = subprocess.run([sys.executable, os.path.join(MR_DIR, "mapper.py")],
                                stdin=f, capture_output=True, env=env, check=True).stdout

    print("[2/3] SHUFFLE : sorting by key (what Hadoop does between map and reduce)")
    lines = mapped.decode("utf-8").splitlines(keepends=True)
    lines.sort(key=lambda l: l.split("\t", 1)[0])
    print(f"               {len(lines):,} intermediate (genre, rating) pairs")

    print("[3/3] REDUCE  : reducer.py")
    reduced = subprocess.run([sys.executable, os.path.join(MR_DIR, "reducer.py")],
                             input="".join(lines).encode("utf-8"), capture_output=True, check=True).stdout

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "wb") as f:
        f.write(reduced)

    rows = [l.split("\t") for l in reduced.decode("utf-8").splitlines()]
    rows.sort(key=lambda r: float(r[1]), reverse=True)
    print(f"\n{'Genre':<20}{'Avg Rating':>12}{'Ratings':>10}")
    print("-" * 42)
    for genre, avg, cnt in rows:
        print(f"{genre:<20}{float(avg):>12.3f}{int(cnt):>10,}")
    print(f"\nSaved: {OUT_FILE}")


if __name__ == "__main__":
    main()
