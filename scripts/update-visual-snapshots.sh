#!/usr/bin/env bash
# e2e/visual 스냅샷 기준 이미지를 CI와 동일한 Linux 렌더링으로 재생성한다.
# 로컬(macOS) 렌더링은 CI와 픽셀이 달라 정본이 될 수 없으므로 항상 이 스크립트로 갱신한다.
# 호스트의 node_modules·.next(다른 플랫폼 바이너리)와 충돌하지 않도록 컨테이너 전용 볼륨을 쓴다.
set -euo pipefail

cd "$(dirname "$0")/.."

PLAYWRIGHT_VERSION="$(node -p "require('@playwright/test/package.json').version")"
IMAGE="mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble"

echo "Using image: ${IMAGE}"

docker run --rm \
  -v "$PWD":/work \
  -v manyak-web-visual-node-modules:/work/node_modules \
  -v manyak-web-visual-next:/work/.next \
  -v manyak-web-visual-pnpm-store:/pnpm-store \
  -w /work \
  -e CI=1 \
  -e NEXT_PUBLIC_KAKAO_JS_KEY=test-kakao-key \
  "$IMAGE" \
  bash -lc 'corepack enable \
    && pnpm install --frozen-lockfile --store-dir /pnpm-store \
    && pnpm exec playwright test e2e/visual --update-snapshots --reporter=line "$@"' -- "$@"
