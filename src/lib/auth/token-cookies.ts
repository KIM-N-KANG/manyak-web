import { cookies } from 'next/headers';

import type { TokenResponse } from '@/api/generated/models';

import {
  ACCESS_TOKEN_COOKIE,
  computeExpiresAt,
  EXPIRES_AT_COOKIE,
  parseExpiresAt,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE_MAX_AGE_SECONDS,
} from './token-cookie-policy';

/**
 * NextAuth(JWT 전략) 세션 쿠키 이름. 백엔드 세션 폐기(재발급 실패) 시 함께 지워
 * "NextAuth는 회원인데 백엔드는 게스트"인 불일치 상태를 막는다.
 */
const NEXTAUTH_SESSION_COOKIES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
];

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
} as const;

export type BackendSessionTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

/** BFF 쿠키에서 백엔드 세션 토큰을 읽는다. 하나라도 없거나 손상이면 null(게스트 취급). */
export async function readBackendSessionTokens(): Promise<BackendSessionTokens | null> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  const expiresAt = parseExpiresAt(store.get(EXPIRES_AT_COOKIE)?.value);

  if (!accessToken || !refreshToken || expiresAt === null) {
    return null;
  }

  return { accessToken, refreshToken, expiresAt };
}

/** 로그인·재발급 응답의 토큰 쌍을 httpOnly 쿠키로 보관한다(브라우저 JS 비노출 — 스펙 §3-8). */
export async function writeBackendSessionTokens(
  tokens: TokenResponse,
  nowMs: number,
): Promise<void> {
  const { accessToken, refreshToken, expiresIn } = tokens;

  if (!accessToken || !refreshToken || typeof expiresIn !== 'number') {
    throw new Error('토큰 응답에 필수 값이 없습니다.');
  }

  const store = await cookies();

  store.set(ACCESS_TOKEN_COOKIE, accessToken, COOKIE_OPTIONS);
  store.set(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
  store.set(
    EXPIRES_AT_COOKIE,
    String(computeExpiresAt(nowMs, expiresIn)),
    COOKIE_OPTIONS,
  );
}

/** BFF 토큰 쿠키와 NextAuth 세션 쿠키를 모두 폐기해 게스트 모드로 되돌린다. */
export async function clearBackendSession(): Promise<void> {
  const store = await cookies();

  for (const name of [
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    EXPIRES_AT_COOKIE,
    ...NEXTAUTH_SESSION_COOKIES,
  ]) {
    store.delete(name);
  }
}
