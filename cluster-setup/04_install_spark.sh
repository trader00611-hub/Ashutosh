#!/usr/bin/env bash
# STEP 4 - Run on MASTER only, as user "hadoop".
# Installs Spark 3.5.3. Spark runs ON YARN, so it does not need to be installed on the workers:
# YARN ships the Spark libraries to worker1/worker2 automatically when a job is submitted.
set -euo pipefail

SPARK_VERSION=3.5.3
TARBALL="$HOME/spark-$SPARK_VERSION-bin-hadoop3.tgz"

if [ ! -f "$TARBALL" ]; then
    wget -O "$TARBALL" "https://archive.apache.org/dist/spark/spark-$SPARK_VERSION/spark-$SPARK_VERSION-bin-hadoop3.tgz"
fi

if [ ! -d "$HOME/spark" ]; then
    tar -xzf "$TARBALL" -C "$HOME"
    mv "$HOME/spark-$SPARK_VERSION-bin-hadoop3" "$HOME/spark"
fi

if ! grep -q "SPARK_HOME" "$HOME/.bashrc"; then
cat >> "$HOME/.bashrc" <<'EOF'

# ---- Spark ----
export SPARK_HOME=$HOME/spark
export PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin
export PYSPARK_PYTHON=python3
export YARN_CONF_DIR=$HADOOP_HOME/etc/hadoop
EOF
fi

cat > "$HOME/spark/conf/spark-defaults.conf" <<'EOF'
spark.master                     yarn
spark.submit.deployMode          client
spark.driver.memory              1g
spark.executor.memory            1g
spark.executor.instances         2
spark.eventLog.enabled           true
spark.eventLog.dir               hdfs://master:9000/spark-logs
spark.history.fs.logDirectory    hdfs://master:9000/spark-logs
spark.sql.session.timeZone       UTC
EOF

echo
echo "Spark installed at ~/spark. Run:  source ~/.bashrc  &&  spark-submit --version"
echo "After HDFS is running, create the event log dir once:  hdfs dfs -mkdir -p /spark-logs"
