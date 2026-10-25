#!/usr/bin/env bash
# Downloads the MovieLens "ml-latest-small" dataset (100,836 ratings, 9,742 movies, 610 users).
# Usage:  bash data/download_data.sh            (small, default)
#         bash data/download_data.sh full       (ml-25m: 25 million ratings, ~250 MB - for a "real" big data demo)
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)/raw"
mkdir -p "$DIR"

if [ "${1:-}" == "full" ]; then
    NAME="ml-25m"
else
    NAME="ml-latest-small"
fi

wget -O "$DIR/$NAME.zip" "https://files.grouplens.org/datasets/movielens/$NAME.zip"
unzip -o "$DIR/$NAME.zip" -d "$DIR"

if [ "$NAME" != "ml-latest-small" ]; then
    # The rest of the project expects data/raw/ml-latest-small/, so point it at the big dataset
    rm -rf "$DIR/ml-latest-small"
    ln -s "$DIR/$NAME" "$DIR/ml-latest-small"
fi

ls -lh "$DIR/$NAME"
