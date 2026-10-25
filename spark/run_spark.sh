#!/usr/bin/env bash
# Submits the Spark analysis job to YARN (Spark executors run on worker1 and worker2).
# Run on the MASTER node.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

HDFS="hdfs://master:9000"

spark-submit \
    --master yarn \
    --deploy-mode client \
    --name "MovieRatingAnalysis" \
    --num-executors 2 \
    --executor-cores 1 \
    --executor-memory 1g \
    --driver-memory 1g \
    spark/movie_analysis.py \
    --ratings  "$HDFS/movielens/input/ratings.csv" \
    --movies   "$HDFS/movielens/input/movies.csv" \
    --hdfs-out "$HDFS/movielens/output/spark_genre_avg" \
    --mapreduce-result output/mapreduce_genre_avg.tsv \
    --json-out docs/data/results.json
