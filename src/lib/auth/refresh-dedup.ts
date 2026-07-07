import type { TokenResponse } from '@/api/generated/models';

import { refreshOnServer } from './backend-client';

/**
 * refresh 토큰은 1회용(회전 + 재사용 탐지 시 family 전체 폐기)이라, 같은 토큰으로 두 번
 * 재발급하면 세션이 통째로 무효화된다. 특히 access 토큰이 없어 요청마다 재발급하는
 * 복구 상황에서는 페이지 이동 시 몰린 요청들이 같은 토큰을 서로 다시 써 재사용 탐지에
 * 걸리기 쉽다. 이를 막으려고 재발급 결과를 토큰별로 짧게 캐시해, 동시든 살짝 어긋나든
 * 한 버스트의 요청들이 동일한 결과(새 토큰 1쌍)를 공유하게 한다. 실패는 캐시하지 않아
 * 재시도를 허용한다(교차 인스턴스 한계는 설계 문서 참고 — 게스트 강등으로 수용).
 */
const REFRESH_DEDUP_TTL_MS = 10 * 1000;

const refreshCache = new Map<
  string,
  { promise: Promise<TokenResponse>; cachedAtMs: number }
>();

export function refreshWithDedup(
  refreshToken: string,
  executor: (refreshToken: string) => Promise<TokenResponse> = refreshOnServer,
  nowMs: number = Date.now(),
): Promise<TokenResponse> {
  // 만료된 캐시 항목을 정리해 메모리 누수를 막는다.
  for (const [token, entry] of refreshCache) {
    if (nowMs - entry.cachedAtMs >= REFRESH_DEDUP_TTL_MS) {
      refreshCache.delete(token);
    }
  }

  const cached = refreshCache.get(refreshToken);

  if (cached && nowMs - cached.cachedAtMs < REFRESH_DEDUP_TTL_MS) {
    return cached.promise;
  }

  const refreshPromise = executor(refreshToken);

  refreshCache.set(refreshToken, {
    promise: refreshPromise,
    cachedAtMs: nowMs,
  });

  // 실패한 재발급은 캐시에서 제거해 다음 요청이 다시 시도할 수 있게 한다.
  refreshPromise.catch(() => {
    const current = refreshCache.get(refreshToken);

    if (current?.promise === refreshPromise) {
      refreshCache.delete(refreshToken);
    }
  });

  return refreshPromise;
}
