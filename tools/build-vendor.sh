#!/usr/bin/env bash
# Recompila os pacotes de terceiros usados pelo site:
#   vendor/three.bundle.min.js       Three.js + addons (controles, pós-processamento, reflexo)
#   vendor/pathtracer.bundle.min.js  three-gpu-pathtracer (modo foto), usando o mesmo Three.js
# Só é preciso rodar ao atualizar as versões.
set -euo pipefail
cd "$(dirname "$0")"
TMP="$(mktemp -d)"
cp vendor-entry.js pathtracer-entry.js "$TMP/"
( cd "$TMP" && npm init -y >/dev/null && npm i three@0.186.1 three-gpu-pathtracer@0.0.26 three-mesh-bvh@0.9.15 xatlas-web esbuild >/dev/null )
"$TMP/node_modules/.bin/esbuild" "$TMP/vendor-entry.js" --bundle --format=esm --minify \
  --legal-comments=eof --outfile=../vendor/three.bundle.min.js
# o path tracer importa "three" de fora; apontamos para o bundle acima
"$TMP/node_modules/.bin/esbuild" "$TMP/pathtracer-entry.js" --bundle --format=esm --minify \
  --legal-comments=eof --external:three --outfile="$TMP/pt.js"
sed -e 's#from"three"#from"./three.bundle.min.js"#g' \
    -e 's#from"three/examples/jsm/postprocessing/Pass.js"#from"./three.bundle.min.js"#g' \
    "$TMP/pt.js" > ../vendor/pathtracer.bundle.min.js
rm -rf "$TMP"
echo "ok: vendor/three.bundle.min.js e vendor/pathtracer.bundle.min.js"
