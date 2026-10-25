#!/usr/bin/env bash
# STEP 1 - Run on ALL THREE machines (master, worker1, worker2), logged in as user "hadoop".
# Installs Java 11, SSH server, Python 3 and helper tools.
set -euo pipefail

sudo apt update
sudo apt install -y openjdk-11-jdk openssh-server python3 python3-pip wget rsync net-tools
sudo systemctl enable --now ssh

echo
java -version
python3 --version
echo
echo "Done. Now edit /etc/hosts on this machine (see cluster-setup/hosts.example)."
echo "This machine's IP address(es): $(hostname -I)"
