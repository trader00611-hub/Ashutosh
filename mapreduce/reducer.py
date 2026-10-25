#!/usr/bin/env python3
"""
Hadoop Streaming REDUCER - Average rating per genre.

Input  (stdin) : genre <TAB> rating   (Hadoop sorts by key, so equal genres arrive together)
Output (stdout): genre <TAB> average_rating <TAB> number_of_ratings
"""
import sys


def emit(genre, total, count):
    if genre is not None and count > 0:
        print(f"{genre}\t{total / count:.4f}\t{count}")


def main():
    current_genre, total, count = None, 0.0, 0

    for line in sys.stdin:
        try:
            genre, rating = line.rstrip("\n").split("\t")
            rating = float(rating)
        except ValueError:
            continue

        if genre == current_genre:
            total += rating
            count += 1
        else:
            emit(current_genre, total, count)
            current_genre, total, count = genre, rating, 1

    emit(current_genre, total, count)


if __name__ == "__main__":
    main()
