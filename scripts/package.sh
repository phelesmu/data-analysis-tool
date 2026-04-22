#!/usr/bin/env bash
# Build a portable, offline-runnable release of data-analysis-tool.
#
# Outputs (in ./release/):
#   - data-analysis-tool-static-<version>.zip   plain static site (any web server)
#   - data-analysis-tool-image-<version>.tar    docker image (load with `docker load`)
#   - RUN.txt                                   short instructions
#
# Usage:
#   ./scripts/package.sh           # uses version from package.json
#   VERSION=1.0.0 ./scripts/package.sh
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="${VERSION:-$(node -p "require('./package.json').version || '0.0.0'")}"
NAME="data-analysis-tool"
OUT="release"
STATIC_ZIP="${OUT}/${NAME}-static-${VERSION}.zip"
IMAGE_TAR="${OUT}/${NAME}-image-${VERSION}.tar"
IMAGE_TAG="${NAME}:${VERSION}"

mkdir -p "${OUT}"

echo ">>> 1/3  Installing dependencies (if needed)"
if [ ! -d node_modules ]; then
  npm ci --no-audit --no-fund
fi

echo ">>> 2/3  Building static site -> dist/"
npm run build

echo ">>> 3/3  Packaging"
rm -f "${STATIC_ZIP}"
( cd dist && zip -qr "../${STATIC_ZIP}" . )
echo "  - ${STATIC_ZIP}  ($(du -h "${STATIC_ZIP}" | cut -f1))"

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker build -t "${IMAGE_TAG}" .
  docker save "${IMAGE_TAG}" -o "${IMAGE_TAR}"
  echo "  - ${IMAGE_TAR}      ($(du -h "${IMAGE_TAR}" | cut -f1))"
else
  echo "  ! docker daemon not available - skipping image tarball (start Docker Desktop and re-run to produce ${IMAGE_TAR})"
fi

cat > "${OUT}/RUN.txt" <<EOF
data-analysis-tool ${VERSION}
=============================

Option A) Plain static site
---------------------------
  unzip ${NAME}-static-${VERSION}.zip -d site
  npx serve site -l 5000          # or any static web server
  # open http://localhost:5000

Option B) Docker image (offline)
--------------------------------
  docker load -i ${NAME}-image-${VERSION}.tar
  docker run --rm -p 5000:80 ${IMAGE_TAG}
  # open http://localhost:5000

Option C) Build & run from source
---------------------------------
  npm ci
  npm run build && npx serve dist -l 5000
EOF

echo
echo "Done. See ${OUT}/RUN.txt for usage."
