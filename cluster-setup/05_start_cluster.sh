#!/usr/bin/env bash
# STEP 5 - Run on MASTER only. Starts HDFS + YARN on all three machines.
#   First time ever:   bash cluster-setup/05_start_cluster.sh --format
#   Every other time:  bash cluster-setup/05_start_cluster.sh
set -euo pipefail

if [ "${1:-}" == "--format" ]; then
    echo ">> Formatting the NameNode (first time only - this ERASES HDFS metadata)"
    hdfs namenode -format -force
fi

start-dfs.sh
start-yarn.sh
mapred --daemon start historyserver || true

sleep 5
hdfs dfs -mkdir -p /spark-logs /movielens/input /movielens/output

echo
echo "===== Java processes on master (expect NameNode, SecondaryNameNode, ResourceManager, JobHistoryServer) ====="
jps
for w in worker1 worker2; do
    echo "===== $w (expect DataNode, NodeManager) ====="
    ssh "$w" "$JAVA_HOME/bin/jps"   # same Java path on every node (same Ubuntu + OpenJDK)
done

echo
echo "===== HDFS report ====="
hdfs dfsadmin -report | grep -E "Live datanodes|Name:|DFS Remaining:" || true
echo
echo "===== YARN nodes ====="
yarn node -list

echo
echo "Web UIs:  HDFS  http://master:9870   |   YARN  http://master:8088   |   Job history  http://master:19888"
