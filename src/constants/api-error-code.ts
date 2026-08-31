/**
 * 백엔드가 `ApiErrorResponse.code`로 내려주는 앱 수준 에러 코드.
 *
 * 같은 HTTP status(예: 402)라도 사유를 이 코드로 구분한다(와이어 계약, 백엔드 KNK-524).
 * 문자열 값은 백엔드와의 계약이므로 임의로 바꾸지 않는다.
 */
export const API_ERROR_CODE = {
  /** 회원 이프 잔액 부족(402). 게스트 체험 한도와 구분한다. */
  INSUFFICIENT_CREDIT: 'INSUFFICIENT_CREDIT',
  /** 게스트 체험 한도 소진(402). 이프 부족과 구분한다. */
  GUEST_TRIAL_LIMIT_EXCEEDED: 'GUEST_TRIAL_LIMIT_EXCEEDED',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODE)[keyof typeof API_ERROR_CODE];
