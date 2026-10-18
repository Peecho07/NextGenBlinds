#!/usr/bin/env bash
# Downloads every Pexels photo listed in src/site.json into src/assets/img/photos/ at 640, 1024 and 1600px.
# Run once on any machine with internet, then rebuild: pages switch from the Pexels CDN to the self-hosted copies.
# Usage: bash tools/fetch-images.sh
set -euo pipefail
cd "$(dirname "$0")/.."
out=src/assets/img/photos
mkdir -p "$out"
node -e 'const s=require("./src/site.json");for(const[k,v] of Object.entries(s.photos)) if(v.pexels) console.log(k+" "+v.pexels)' |
while read -r key id; do
  for w in 640 1024 1600; do
    f="$out/$key-$w.jpg"
    [ -s "$f" ] && continue
    curl -fsSL "https://images.pexels.com/photos/$id/pexels-photo-$id.jpeg?auto=compress&cs=tinysrgb&w=$w" -o "$f"
    echo "saved $f"
  done
done
echo "Done. Run: node build.js"
