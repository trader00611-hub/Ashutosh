#!/usr/bin/env python3
"""
Hadoop Streaming MAPPER - Average rating per genre.

Input  (stdin) : lines of ratings.csv  ->  userId,movieId,rating,timestamp
Side data      : movies.csv shipped to every node with  -files movies.csv
Output (stdout): genre <TAB> rating     (one line per genre of the movie)

Example:
    ratings line : 1,1,4.0,964982703
    movie 1      : Toy Story (1995) -> Adventure|Animation|Children|Comedy|Fantasy
    emits        : Adventure\t4.0, Animation\t4.0, Children\t4.0, ...
"""
import csv
import os
import sys

MOVIES_FILE = os.environ.get("MOVIES_FILE", "movies.csv")


def load_movie_genres(path):
    """Build a lookup table movieId -> [genres] from movies.csv (distributed cache)."""
    genres = {}
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        next(reader, None)  # skip header
        for row in reader:
            if len(row) < 3:
                continue
            movie_id, _title, genre_str = row[0], row[1], row[2]
            if genre_str and genre_str != "(no genres listed)":
                genres[movie_id] = genre_str.split("|")
    return genres


def main():
    movie_genres = load_movie_genres(MOVIES_FILE)
    for line in sys.stdin:
        parts = line.strip().split(",")
        if len(parts) != 4 or parts[0] == "userId":  # skip header / bad rows
            continue
        _user_id, movie_id, rating, _ts = parts
        try:
            float(rating)
        except ValueError:
            continue
        for genre in movie_genres.get(movie_id, []):
            print(f"{genre}\t{rating}")


if __name__ == "__main__":
    main()
