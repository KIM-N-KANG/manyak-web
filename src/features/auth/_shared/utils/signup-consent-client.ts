'use client';

import { getSession, signIn } from 'next-auth/react';

import type { UserConsentRequest } from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import {
  isSignupConsentSummary,
  SIGNUP_CONSENT_ENDPOINT,
  SIGNUP_CONSENT_ERROR,
  SIGNUP_CONSENT_PROVIDER_ID,
  type SignupConsentErrorCode,
  type SignupConsentSummary,
  toSignupConsentErrorCode,
} from '@/lib/auth/signup-consent';

import { clearPendingLogin } from './pending-login-storage';

/**
 * BFF에서 대기 중인 가입 동의 요약을 읽는다. 생성된 API 훅의 대상이 아닌 BFF 라우트라
 * 직접 호출한다.
 *
 * @returns 가입 동의 요약, 대기가 없으면 null
 * @throws 네트워크 오류나 404가 아닌 실패 응답이면 에러
 */
export async function fetchPendingSignupConsent(): Promise<SignupConsentSummary | null> {
  // 오류 화면의 정리 effect보다 조회가 먼저 실행돼도 끝난 로그인을 다시 조회하지 않는다.
  if (
    typeof window !== 'undefined' &&
    window.location.pathname === APP_PATH.LOGIN &&
    new URLSearchParams(window.location.search).has('error')
  ) {
    return null;
  }

  const response = await fetch(SIGNUP_CONSENT_ENDPOINT, { cache: 'no-store' });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `가입 동의 대기를 확인하지 못했습니다 (${response.status})`,
    );
  }

  const body: unknown = await response.json();

  return isSignupConsentSummary(body) ? body : null;
}

/**
 * 가입 동의 대기를 취소한다. 실패해도 대기 쿠키는 서버 대기 코드와 함께 곧 만료되므로
 * 사용자 흐름을 막지 않는다. OAuth로 페이지를 떠나는 중에도 끝나도록 keepalive로 보낸다.
 */
export async function cancelPendingSignupConsent(): Promise<void> {
  await fetch(SIGNUP_CONSENT_ENDPOINT, {
    method: 'DELETE',
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * 이 탭에서 끝내지 않은 로그인을 포기한다. 탭 로그인 표시를 지우고 가입 대기를 취소한다.
 * 시트를 거치지 않고 로그인 시도가 끝난 경우에 쓴다. 히스토리 이동으로 다시 불러온 문서와
 * OAuth 오류로 열린 로그인 화면이다. 후자는 지난 Google 화면에서 계정을 다시 골라 앞선 콜백의
 * 가입 대기가 남은 경우로, 실패 안내와 동의 시트가 함께 뜨지 않게 한다.
 */
export function abandonPendingLogin(): void {
  clearPendingLogin();
  void cancelPendingSignupConsent();
}

/** 가입 동의 제출 결과. 성공이면 새 세션의 회원 ID를 돌려준다. */
export type SignupConsentSubmitResult =
  | { ok: true; userId: string }
  | { ok: false; code: SignupConsentErrorCode };

/**
 * 동의한 필수 항목 버전을 가입 동의 Credentials로 보내 가입을 완료한다. 성공하면
 * Auth.js가 세션을 만들고 `signIn`이 세션 조회까지 갱신한다.
 *
 * @param request 동의한 필수 항목과 버전
 * @returns 회원 ID 또는 실패 code
 */
export async function submitSignupConsent(
  request: UserConsentRequest,
): Promise<SignupConsentSubmitResult> {
  try {
    const result = await signIn(SIGNUP_CONSENT_PROVIDER_ID, {
      ...request,
      redirect: false,
    });

    if (!result || result.error) {
      return { ok: false, code: toSignupConsentErrorCode(result?.code) };
    }

    const session = await getSession();

    return session?.user?.id
      ? { ok: true, userId: session.user.id }
      : { ok: false, code: SIGNUP_CONSENT_ERROR.RETRYABLE };
  } catch {
    return { ok: false, code: SIGNUP_CONSENT_ERROR.RETRYABLE };
  }
}
