import { cookies } from 'next/headers';

import type { SocialAuthResponse } from '@/api/generated/models';

import {
  isSignupConsentSummary,
  SIGNUP_CONSENT_COOKIE_NAME,
  type SignupConsentSummary,
} from './signup-consent';

/** 쿠키에 보관하는 대기 정보. 클라이언트에는 대기 코드를 뺀 요약만 내려준다. */
export type PendingSignupConsent = SignupConsentSummary & {
  consentToken: string;
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;

/**
 * `CONSENT_REQUIRED` 응답을 쿠키에 담을 대기 정보로 바꾼다. 대기 코드·만료 시각·동의
 * 상태가 빠졌거나 동의할 항목이 하나도 없으면 해석할 수 없는 응답으로 보고 null을 반환한다.
 *
 * @param response 소셜 인증 응답
 * @returns 대기 정보, 해석할 수 없으면 null
 */
export function toPendingSignupConsent(
  response: SocialAuthResponse,
): PendingSignupConsent | null {
  const { consentToken, expiresAt, consents } = response;

  if (
    !consentToken ||
    !expiresAt ||
    !consents ||
    !Object.values(consents).some((status) => status?.needsConsent === true)
  ) {
    return null;
  }

  return { consentToken, expiresAt, consents };
}

/**
 * 쿠키 값을 대기 정보로 복원한다. 손상됐거나 만료 시각이 지났으면 없는 것으로 본다.
 *
 * @param raw 쿠키 값
 * @param nowMs 현재 시각(ms epoch)
 * @returns 대기 정보, 없거나 손상·만료면 null
 */
export function parsePendingSignupConsent(
  raw: string | undefined,
  nowMs: number,
): PendingSignupConsent | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    !isSignupConsentSummary(parsed) ||
    typeof (parsed as { consentToken?: unknown }).consentToken !== 'string'
  ) {
    return null;
  }

  const pending = parsed as PendingSignupConsent;
  const expiresAtMs = Date.parse(pending.expiresAt);

  return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs ? pending : null;
}

/**
 * 요청 쿠키에서 대기 정보를 읽는다.
 *
 * @param nowMs 현재 시각(ms epoch)
 * @returns 대기 정보, 없거나 손상·만료면 null
 */
export async function readPendingSignupConsent(
  nowMs = Date.now(),
): Promise<PendingSignupConsent | null> {
  const store = await cookies();

  return parsePendingSignupConsent(
    store.get(SIGNUP_CONSENT_COOKIE_NAME)?.value,
    nowMs,
  );
}

/**
 * 대기 정보를 서버 대기 코드의 만료 시각까지만 유지되는 쿠키로 쓴다.
 * `cookies().set`이 값을 인코딩하므로 JSON을 미리 인코딩하지 않는다.
 *
 * @param pending 대기 정보
 * @param nowMs 현재 시각(ms epoch)
 */
export async function writePendingSignupConsent(
  pending: PendingSignupConsent,
  nowMs = Date.now(),
): Promise<void> {
  const store = await cookies();
  const maxAge = Math.floor((Date.parse(pending.expiresAt) - nowMs) / 1000);

  store.set(SIGNUP_CONSENT_COOKIE_NAME, JSON.stringify(pending), {
    ...COOKIE_OPTIONS,
    maxAge: Math.max(0, maxAge),
  });
}

/** 대기 쿠키를 쓰기와 같은 속성으로 비우고 과거 만료로 지운다. */
export async function clearPendingSignupConsent(): Promise<void> {
  const store = await cookies();

  store.set(SIGNUP_CONSENT_COOKIE_NAME, '', {
    ...COOKIE_OPTIONS,
    expires: new Date(0),
  });
}
