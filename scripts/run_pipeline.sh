#!/usr/bin/env bash
# Runs the WHOLE project on the cluster, end to end. Run on MASTER from the project folder:
#     bash scripts/run_pipeline.sh
# Prerequisite: cluster is running (cluster-setup/05_start_cluster.sh).
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"
DATA="data/raw/ml-latest-small"

echo "================ 1. Get dataset ================"
[ -f "$DATA/ratings.csv" ] || bash data/download_data.sh

echo "================ 2. Upload to HDFS ================"
hdfs dfs -mkdir -p /movielens/input /movielens/output
hdfs dfs -put -f "$DATA/ratings.csv" "$DATA/movies.csv" /movielens/input/
hdfs dfs -ls -h /movielens/input
echo ">> Block locations of ratings.csv (shows data is spread over the workers):"
hdfs fsck /movielens/input/ratings.csv -files -blocks -locations | grep -E "blk_|Total blocks" | head -n 5 || true

echo "================ 3. Hadoop MapReduce job ================"
bash mapreduce/run_mapreduce.sh

echo "================ 4. Spark job on YARN ================"
bash spark/run_spark.sh

echo "================ 5. Results in HDFS ================"
hdfs dfs -ls /movielens/output
hdfs dfs -cat /movielens/output/spark_genre_avg/part-*.csv | head -n 10 || true

echo
echo "Done. Dashboard data: docs/data/results.json"
echo "Preview locally :  cd docs && python3 -m http.server 8000   ->  http://localhost:8000"
echo "Publish online  :  git add docs/data/results.json && git commit -m 'Cluster results' && git push"
