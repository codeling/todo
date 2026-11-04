#!/bin/sh
# Copies the third-party libraries pinned in package.json / package-lock.json
# from node_modules to vendor/ (which is committed, so the server needs no npm).
# Usage: npm ci && npm run vendor
set -eu
cd "$(dirname "$0")/.."
NM=node_modules
if [ ! -d "$NM" ]; then
    echo "node_modules missing, run 'npm ci' first" >&2
    exit 1
fi
rm -rf vendor
mkdir -p vendor/jquery vendor/tagify
cp "$NM/jquery/dist/jquery.min.js" "$NM/jquery/LICENSE.txt" vendor/jquery/
cp "$NM/@yaireo/tagify/dist/tagify.js" "$NM/@yaireo/tagify/dist/tagify.css" vendor/tagify/
cp "$NM/@yaireo/tagify/LICENSE" vendor/tagify/
echo "vendor/ updated"
