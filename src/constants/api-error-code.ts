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
  /** 동의 기록의 버전이 서버 요구 버전과 다름(400). 최신 상태를 다시 조회해 재동의받는다. */
  CONSENT_VERSION_MISMATCH: 'CONSENT_VERSION_MISMATCH',
  /** 가입 완료 요청에 현재 필요한 필수 항목이 빠짐(400). 약관 개정과 같이 다시 로그인해 받는다. */
  CONSENT_REQUIRED_MISSING: 'CONSENT_REQUIRED_MISSING',
  /** 같은 채팅의 이어쓰기나 재생성이 생성 중(409). 생성 중 화면으로 바꿔 이어서 받는다. */
  CHAT_TURN_IN_PROGRESS: 'CHAT_TURN_IN_PROGRESS',
  /** 보낸 마지막 턴이 서버의 마지막 턴과 다름(409). 상세를 다시 조회한다. */
  CHAT_TURN_STALE: 'CHAT_TURN_STALE',
  /** AI가 입력 내용을 이유로 간편 제작 생성을 거절함(422). 같은 입력은 다시 거절되므로 입력을 고치게 한다. */
  CONTENT_REJECTED: 'CONTENT_REJECTED',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODE)[keyof typeof API_ERROR_CODE];
