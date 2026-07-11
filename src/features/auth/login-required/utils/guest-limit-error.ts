import { API_ERROR_CODE } from '@/constants/api-error-code';
import { FetchError, getApiErrorCode } from '@/lib/custom-fetch';

type SessionStatus = 'authenticated' | 'loading' | 'unauthenticated';

/** 402(Payment Required) 응답의 사유 구분. */
export type PaymentRequiredReason = 'guest-trial-limit' | 'insufficient-credit';

/**
 * 에러가 결제 필요(402 Payment Required) 응답인지 판정한다.
 * 게스트 한도인지 회원 크레딧 부족인지 사유 구분은 {@link resolvePaymentRequiredReason}가 담당한다.
 */
export function isPaymentRequiredError(error: unknown): boolean {
  return error instanceof FetchError && error.status === 402;
}

/**
 * 402 응답의 사유를 게스트 체험 한도 / 회원 크레딧 부족으로 구분한다.
 *
 * - 바디 code가 있으면 code로 구분한다(백엔드 KNK-524: `GUEST_TRIAL_LIMIT_EXCEEDED` / `INSUFFICIENT_CREDIT`).
 * - code가 없는(구버전·바디 드롭) 402는 세션 상태로 추론한다: 미로그인이면 게스트 한도,
 *   그 외(회원·세션 미확정)는 크레딧 부족으로 본다.
 * - 402가 아니면 null.
 */
export function resolvePaymentRequiredReason(
  error: unknown,
  sessionStatus: SessionStatus,
): PaymentRequiredReason | null {
  if (!isPaymentRequiredError(error)) {
    return null;
  }

  const code = getApiErrorCode(error);

  if (code === API_ERROR_CODE.GUEST_TRIAL_LIMIT_EXCEEDED) {
    return 'guest-trial-limit';
  }

  if (code === API_ERROR_CODE.INSUFFICIENT_CREDIT) {
    return 'insufficient-credit';
  }

  // code가 없거나 알 수 없으면 기존 세션 기반 추론으로 폴백한다.
  return sessionStatus === 'unauthenticated'
    ? 'guest-trial-limit'
    : 'insufficient-credit';
}
