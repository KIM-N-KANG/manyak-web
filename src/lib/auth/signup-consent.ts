import type { UserConsentResponse } from '@/api/generated/models';

/** 가입 동의 완료에 쓰는 Auth.js Credentials 프로바이더 ID. */
export const SIGNUP_CONSENT_PROVIDER_ID = 'signup-consent';

/**
 * 동의 대기 중인 소셜 인증을 보관하는 HttpOnly 쿠키 이름. 대기 코드는 완료 API 전용
 * 비밀값이라 브라우저 JS, URL, 로그, 분석, 오류 수집에 내보내지 않는다.
 */
export const SIGNUP_CONSENT_COOKIE_NAME = 'manyak_signup_consent';

/** 대기 중인 가입 동의를 조회·취소하는 BFF 경로. */
export const SIGNUP_CONSENT_ENDPOINT = '/api/auth/signup-consent';

/**
 * 가입 동의 완료 실패 코드. Credentials 프로바이더가 `CredentialsSignin.code`로 내보내고
 * 동의 시트가 `signIn` 결과의 `code`로 받아 처리를 고른다.
 * - `expired`: 대기 코드가 없거나 만료·소비됐다. 다시 로그인해야 한다.
 * - `outdated`: 약관 버전이 바뀌었거나 필요한 항목이 늘었다. 다시 로그인해 새 버전을 받는다.
 * - `retryable`: 일시 실패다. 같은 대기 코드로 다시 제출할 수 있다.
 */
export const SIGNUP_CONSENT_ERROR = {
  EXPIRED: 'expired',
  OUTDATED: 'outdated',
  RETRYABLE: 'retryable',
} as const;

export type SignupConsentErrorCode =
  (typeof SIGNUP_CONSENT_ERROR)[keyof typeof SIGNUP_CONSENT_ERROR];

/** BFF가 클라이언트에 내려주는 대기 중인 가입 동의 요약. 대기 코드는 담지 않는다. */
export type SignupConsentSummary = {
  consents: UserConsentResponse;
  expiresAt: string;
};

/**
 * 값이 가입 동의 요약 형식인지 판정한다. BFF 응답과 쿠키 복원에서 함께 쓴다.
 *
 * @param value 검사할 값
 * @returns 동의 상태 객체와 만료 시각 문자열이 있으면 true
 */
export function isSignupConsentSummary(
  value: unknown,
): value is SignupConsentSummary {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { consents, expiresAt } = value as Record<string, unknown>;

  return (
    typeof consents === 'object' &&
    consents !== null &&
    !Array.isArray(consents) &&
    typeof expiresAt === 'string'
  );
}

/**
 * `signIn` 결과의 code를 가입 동의 실패 코드로 좁힌다. 모르는 값은 재시도 가능한 실패로 본다.
 *
 * @param value `signIn` 결과의 code
 * @returns 가입 동의 실패 코드
 */
export function toSignupConsentErrorCode(
  value: unknown,
): SignupConsentErrorCode {
  return (
    Object.values(SIGNUP_CONSENT_ERROR).find((code) => code === value) ??
    SIGNUP_CONSENT_ERROR.RETRYABLE
  );
}
