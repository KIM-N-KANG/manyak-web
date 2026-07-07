import type { TokenResponse } from '@/api/generated/models';

import {
  BackendAuthError,
  fetchMeOnServer,
  loginWithGoogleOnServer,
  refreshOnServer,
} from './backend-client';
import { shouldRefreshAccessToken } from './token-cookie-policy';
import {
  clearBackendSession,
  hasNextAuthSessionCookie,
  readBackendSessionTokens,
  readRefreshTokenCookie,
  writeBackendSessionTokens,
} from './token-cookies';

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

/**
 * ensureFreshAccessToken 결과. 프록시가 게스트(익명 통과)와 세션 만료(능동 로그아웃
 * 신호 필요)를 구분할 수 있도록 판별 유니온으로 표현한다.
 */
export type FreshAccessTokenResult =
  | { status: 'authenticated'; accessToken: string }
  | { status: 'guest' } // 처음부터 토큰 없음
  | { status: 'expired' }; // 회원이었으나 리프레시가 4xx로 확정 거절됨 → 세션 폐기 완료

/**
 * 재발급 실패가 백엔드의 확정 거절(4xx)인지 판별한다. 재사용 탐지로 refresh family가
 * 폐기된 경우 등 재시도해도 소용없는 실패만 능동 로그아웃 대상으로 삼는다. 네트워크
 * 오류·5xx는 회복 가능한 일시 실패이므로 세션을 보존한다.
 */
function isConfirmedAuthRejection(error: unknown): boolean {
  return (
    error instanceof BackendAuthError &&
    error.status >= 400 &&
    error.status < 500
  );
}

/**
 * 백엔드 요청 전에 유효한 access 토큰을 확보한다(스펙 §3-8 선제 재발급).
 *
 * 세션의 실제 자격증명은 refresh 토큰이고 access 토큰은 캐시다. 그래서 access·expiresAt이
 * 없거나 손상돼도 refresh 토큰만 살아 있으면 재발급으로 로그인을 복구한다.
 *
 * - 유효한 access 토큰이 있고 만료 임박도 아니면 그대로 사용
 * - 그 외(만료 임박·access 없음·손상)에는 refresh 토큰으로 재발급
 *   - 성공 → 새 토큰으로 인증
 *   - 4xx 확정 거절 → 세션 폐기 후 expired(능동 로그아웃)
 *   - 일시 실패(네트워크·5xx) → 세션 보존, 이번 요청은 기존 토큰(있으면)으로 best-effort
 * - refresh 토큰이 없으면 복구 불가: NextAuth 세션 쿠키가 남아 있으면(불일치) 폐기 후
 *   expired, 아니면 guest
 */
export async function ensureFreshAccessToken(
  nowMs = Date.now(),
): Promise<FreshAccessTokenResult> {
  const tokens = await readBackendSessionTokens();

  if (tokens && !shouldRefreshAccessToken(tokens.expiresAt, nowMs)) {
    return { status: 'authenticated', accessToken: tokens.accessToken };
  }

  const refreshToken = tokens?.refreshToken ?? (await readRefreshTokenCookie());

  if (!refreshToken) {
    // refresh 토큰이 없어 복구할 수 없다. NextAuth 세션 쿠키만 남아 있으면 "화면은
    // 회원, 서버엔 열쇠 없음"인 불일치 상태이므로(쿠키 손상·수동 삭제 등) 세션을
    // 정리하고 능동 로그아웃을 신호한다. 그마저 없으면 순수 게스트다.
    if (await hasNextAuthSessionCookie()) {
      await clearBackendSession();

      return { status: 'expired' };
    }

    return { status: 'guest' };
  }

  try {
    const refreshed = await refreshWithDedup(refreshToken);

    await writeBackendSessionTokens(refreshed, nowMs);

    // writeBackendSessionTokens가 accessToken 없으면 throw하므로 여기선 항상 존재한다.
    return {
      status: 'authenticated',
      accessToken: refreshed.accessToken ?? '',
    };
  } catch (error) {
    if (isConfirmedAuthRejection(error)) {
      await clearBackendSession();

      return { status: 'expired' };
    }

    // 일시 실패: 세션을 보존한다. 기존 access 토큰이 있으면 best-effort로 통과시키고,
    // 없으면(복구 실패) 이번 요청만 게스트로 처리한다(다음 요청에서 재발급 재시도).
    if (tokens) {
      return { status: 'authenticated', accessToken: tokens.accessToken };
    }

    return { status: 'guest' };
  }
}

/**
 * Google id_token으로 백엔드 세션을 수립하고 세션에 담을 프로필을 반환한다.
 * NextAuth jwt 콜백(최초 로그인)에서 호출한다. 실패 시 던져서 로그인 자체를 실패시킨다.
 *
 * 검증 후 쓰기: BFF 세션 쿠키(writeBackendSessionTokens)는 토큰·사용자 정보 검증을
 * 모두 통과한 마지막 단계에서만 기록한다. 검증 전에 먼저 쓰면, 이후 단계(사용자
 * 조회 등)가 실패해 NextAuth 로그인이 거부되더라도 BFF 쿠키는 이미 기록된 채로
 * 남아 "반쪽 세션"(게스트로 보이는 UI + 프록시의 Authorization 주입이 최대 14일
 * 지속)이 발생할 수 있다. 공유 기기에서는 다음 게스트의 활동이 실패한 계정에
 * 귀속되는 문제로 이어진다.
 */
export async function establishBackendSession(idToken: string): Promise<{
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
}> {
  const tokens = await loginWithGoogleOnServer(idToken);

  if (!tokens.accessToken) {
    throw new Error('토큰 응답에 accessToken이 없습니다.');
  }

  const me = await fetchMeOnServer(tokens.accessToken);

  if (!me.id) {
    throw new Error('사용자 정보 응답에 id가 없습니다.');
  }

  await writeBackendSessionTokens(tokens, Date.now());

  return {
    userId: me.id,
    nickname: me.nickname ?? '',
    profileImageUrl: me.profileImageUrl ?? null,
  };
}
