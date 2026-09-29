#!/usr/bin/env bash
# Recompila vendor/three.bundle.min.js a partir do pacote "three" do npm.
# Só é preciso rodar ao atualizar a versão do Three.js.
set -euo pipefail
cd "$(dirname "$0")"
TMP="$(mktemp -d)"
cp vendor-entry.js "$TMP/"
( cd "$TMP" && npm init -y >/dev/null && npm i three@0.186.1 esbuild >/dev/null )
"$TMP/node_modules/.bin/esbuild" "$TMP/vendor-entry.js" --bundle --format=esm --minify \
  --legal-comments=eof --outfile=../vendor/three.bundle.min.js
rm -rf "$TMP"
echo "ok: vendor/three.bundle.min.js"
