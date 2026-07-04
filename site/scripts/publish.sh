#!/usr/bin/env bash
# site/ 를 빌드해서 repo 루트(GitHub Pages가 서빙하는 위치)로 정적 파일을 복사한다.
set -euo pipefail
cd "$(dirname "$0")/.."   # site/
ROOT="$(cd .. && pwd)"

npm run build

rsync -a --delete \
  --exclude '/site/' --exclude '/.git/' --exclude '/.gitignore' --exclude '/README.md' \
  --exclude '/docs/' --exclude '/.superpowers/' --exclude '/oauth-worker/' \
  out/ "$ROOT/"
touch "$ROOT/.nojekyll"

echo "published to $ROOT"
