#!/usr/bin/env bash
# Run on MASTER to stop everything cleanly before shutting the PCs down.
mapred --daemon stop historyserver || true
stop-yarn.sh
stop-dfs.sh
jps
