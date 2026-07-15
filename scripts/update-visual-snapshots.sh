#!/usr/bin/env bash
# e2e/visual 스냅샷 기준 이미지를 CI와 동일한 Linux 렌더링으로 재생성한다.
# 로컬(macOS) 렌더링은 CI와 픽셀이 달라 정본이 될 수 없으므로 항상 이 스크립트로 갱신한다.
# 호스트의 node_modules·.next(다른 플랫폼 바이너리)와 충돌하지 않도록 컨테이너 전용 볼륨을 쓴다.
set -euo pipefail

cd "$(dirname "$0")/.."

PLAYWRIGHT_VERSION="$(node -p "require('@playwright/test/package.json').version")"
IMAGE="mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble"

echo "Using image: ${IMAGE}"

# CI는 clean checkout이라 gitignore된 env 파일이 없다. 작업 폴더를 통째로 마운트하면
# 로컬 .env.local이 빌드에 섞여 기준 이미지가 CI 렌더링과 달라질 수 있으므로,
# Next가 프로덕션 빌드에서 읽는 env 파일 중 git이 추적하지 않는 것은 빈 파일로 가린다.
EMPTY_ENV="$(mktemp)"
trap 'rm -f "$EMPTY_ENV"' EXIT

ENV_MASKS=()
for env_file in .env .env.production .env.local .env.production.local; do
  if [ -f "$env_file" ] && ! git ls-files --error-unmatch "$env_file" >/dev/null 2>&1; then
    ENV_MASKS+=(-v "${EMPTY_ENV}:/work/${env_file}")
    echo "Masking untracked ${env_file} (CI checkout has no such file)"
  fi
done

# bash 3.2(macOS 기본)에서는 set -u와 빈 배열 확장이 충돌하므로 ${arr[@]+...} 형태를 쓴다.
docker run --rm \
  -v "$PWD":/work \
  -v manyak-web-visual-node-modules:/work/node_modules \
  -v manyak-web-visual-next:/work/.next \
  -v manyak-web-visual-pnpm-store:/pnpm-store \
  ${ENV_MASKS[@]+"${ENV_MASKS[@]}"} \
  -w /work \
  -e CI=1 \
  -e NEXT_PUBLIC_KAKAO_JS_KEY=test-kakao-key \
  "$IMAGE" \
  bash -lc 'corepack enable \
    && pnpm install --frozen-lockfile --store-dir /pnpm-store \
    && pnpm exec playwright test e2e/visual --update-snapshots --reporter=line "$@"' -- "$@"
