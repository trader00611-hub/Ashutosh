#!/usr/bin/env bash
# STEP 2 - Run on ALL THREE machines as user "hadoop", from inside the project folder.
# Downloads Hadoop 3.3.6 to ~/hadoop, sets environment variables and copies our config files.
#
# Tip: to avoid downloading 700 MB three times, download once on master and copy it:
#     scp ~/hadoop-3.3.6.tar.gz hadoop@worker1:~/   (the script reuses an existing tarball)
set -euo pipefail

HADOOP_VERSION=3.3.6
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARBALL="$HOME/hadoop-$HADOOP_VERSION.tar.gz"

if [ ! -f "$TARBALL" ]; then
    wget -O "$TARBALL" "https://archive.apache.org/dist/hadoop/common/hadoop-$HADOOP_VERSION/hadoop-$HADOOP_VERSION.tar.gz"
fi

if [ ! -d "$HOME/hadoop" ]; then
    tar -xzf "$TARBALL" -C "$HOME"
    mv "$HOME/hadoop-$HADOOP_VERSION" "$HOME/hadoop"
fi

JAVA_HOME_PATH="$(dirname "$(dirname "$(readlink -f "$(which java)")")")"

if ! grep -q "HADOOP_HOME" "$HOME/.bashrc"; then
cat >> "$HOME/.bashrc" <<EOF

# ---- Hadoop ----
export JAVA_HOME=$JAVA_HOME_PATH
export HADOOP_HOME=\$HOME/hadoop
export HADOOP_CONF_DIR=\$HADOOP_HOME/etc/hadoop
export HADOOP_MAPRED_HOME=\$HADOOP_HOME
export PATH=\$PATH:\$HADOOP_HOME/bin:\$HADOOP_HOME/sbin
EOF
fi

# JAVA_HOME must also be in hadoop-env.sh (daemons are started over non-interactive SSH)
sed -i "s|^# export JAVA_HOME=.*|export JAVA_HOME=$JAVA_HOME_PATH|" "$HOME/hadoop/etc/hadoop/hadoop-env.sh"
grep -q "^export JAVA_HOME=" "$HOME/hadoop/etc/hadoop/hadoop-env.sh" || \
    echo "export JAVA_HOME=$JAVA_HOME_PATH" >> "$HOME/hadoop/etc/hadoop/hadoop-env.sh"

cp "$SCRIPT_DIR"/hadoop-config/{core-site.xml,hdfs-site.xml,mapred-site.xml,yarn-site.xml,workers} \
   "$HOME/hadoop/etc/hadoop/"

mkdir -p "$HOME/hadoopdata/hdfs/namenode" "$HOME/hadoopdata/hdfs/datanode" "$HOME/hadoopdata/tmp"

echo
echo "Hadoop installed at ~/hadoop. Run:  source ~/.bashrc  &&  hadoop version"
