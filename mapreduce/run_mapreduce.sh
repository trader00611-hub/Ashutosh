#!/usr/bin/env bash
# Runs the "average rating per genre" job on the Hadoop cluster using Hadoop Streaming.
# Run on the MASTER node, after data has been uploaded to HDFS (see scripts/run_pipeline.sh).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOCAL_MOVIES="$PROJECT_DIR/data/raw/ml-latest-small/movies.csv"

HDFS_INPUT="/movielens/input/ratings.csv"
HDFS_OUTPUT="/movielens/output/mapreduce_genre_avg"

STREAMING_JAR=$(ls "$HADOOP_HOME"/share/hadoop/tools/lib/hadoop-streaming-*.jar | head -n 1)

echo ">> Removing old output (if any): $HDFS_OUTPUT"
hdfs dfs -rm -r -f "$HDFS_OUTPUT"

echo ">> Submitting MapReduce job to YARN"
hadoop jar "$STREAMING_JAR" \
    -D mapreduce.job.name="MovieRating-GenreAverage" \
    -D mapreduce.job.reduces=2 \
    -files "$SCRIPT_DIR/mapper.py,$SCRIPT_DIR/reducer.py,$LOCAL_MOVIES" \
    -mapper "python3 mapper.py" \
    -reducer "python3 reducer.py" \
    -input "$HDFS_INPUT" \
    -output "$HDFS_OUTPUT"

echo ">> Result (genre, avg_rating, num_ratings):"
hdfs dfs -cat "$HDFS_OUTPUT/part-*" | sort -t$'\t' -k2 -nr

mkdir -p "$PROJECT_DIR/output"
hdfs dfs -cat "$HDFS_OUTPUT/part-*" > "$PROJECT_DIR/output/mapreduce_genre_avg.tsv"
echo ">> Saved local copy: output/mapreduce_genre_avg.tsv"
