#!/usr/bin/env bash
# STEP 3 - Run on MASTER only, as user "hadoop".
# Lets master log in to itself and both workers without a password
# (Hadoop's start-dfs.sh / start-yarn.sh use SSH to start daemons on the workers).
set -euo pipefail

if [ ! -f "$HOME/.ssh/id_rsa" ]; then
    ssh-keygen -t rsa -P "" -f "$HOME/.ssh/id_rsa"
fi

for host in master worker1 worker2; do
    echo ">> Copying key to $host (enter the hadoop user's password for $host once)"
    ssh-copy-id -o StrictHostKeyChecking=accept-new "hadoop@$host"
done

echo
echo ">> Testing password-less login:"
for host in master worker1 worker2; do
    ssh "hadoop@$host" "echo OK from \$(hostname)"
done
