import type { TokenResponse } from '@/api/generated/models';

import {
  fetchMeOnServer,
  loginWithGoogleOnServer,
  refreshOnServer,
} from './backend-client';
import { shouldRefreshAccessToken } from './token-cookie-policy';
import {
  clearBackendSession,
  readBackendSessionTokens,
  writeBackendSessionTokens,
} from './token-cookies';

/**
 * refresh 토큰은 1회용(회전 + 재사용 탐지 시 family 전체 폐기)이라, 동시 요청이 각자
 * 재발급하면 세션이 통째로 무효화된다. 같은 토큰의 재발급은 in-flight promise를 공유해
 * 인스턴스 내 1회만 수행한다(교차 인스턴스 한계는 설계 문서 참고 — 게스트 강등으로 수용).
 */
const inFlightRefreshes = new Map<string, Promise<TokenResponse>>();

export function refreshWithDedup(
  refreshToken: string,
  executor: (refreshToken: string) => Promise<TokenResponse> = refreshOnServer,
): Promise<TokenResponse> {
  const existing = inFlightRefreshes.get(refreshToken);

  if (existing) {
    return existing;
  }

  const refreshPromise = executor(refreshToken).finally(() => {
    inFlightRefreshes.delete(refreshToken);
  });

  inFlightRefreshes.set(refreshToken, refreshPromise);

  return refreshPromise;
}

/**
 * 백엔드 요청 전에 유효한 access 토큰을 확보한다(스펙 §3-8 선제 재발급).
 * 게스트(토큰 없음)면 null, 재발급 실패면 세션 폐기 후 null(게스트 강등).
 */
export async function ensureFreshAccessToken(
  nowMs = Date.now(),
): Promise<string | null> {
  const tokens = await readBackendSessionTokens();

  if (!tokens) {
    return null;
  }

  if (!shouldRefreshAccessToken(tokens.expiresAt, nowMs)) {
    return tokens.accessToken;
  }

  try {
    const refreshed = await refreshWithDedup(tokens.refreshToken);

    await writeBackendSessionTokens(refreshed, nowMs);

    return refreshed.accessToken ?? null;
  } catch {
    await clearBackendSession();

    return null;
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
