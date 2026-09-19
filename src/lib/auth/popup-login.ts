/** 팝업 메시지는 완료 알림이며 인증 자격증명이 아니다. */
export const POPUP_LOGIN_MESSAGE_TYPE = 'manyak:google-popup-complete';

export const POPUP_LOGIN_COPY = {
  title: 'Google 로그인',
  complete: '인증 처리가 끝났어요. 원래 화면으로 돌아가 주세요.',
  failed: '로그인을 완료하지 못했어요. 원래 화면에서 다시 시도해 주세요.',
} as const;

/**
 * OAuth state와 별개로 원래 창의 로그인 시도를 식별하는 UUID를 검증한다.
 * @param value 검사할 값
 * @returns UUID v4 문자열이면 true
 */
export function isPopupAttempt(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

/**
 * 출처와 창 참조 검증을 통과한 메시지가 현재 로그인 시도의 결과인지 확인한다.
 * @param data 수신한 메시지
 * @param attempt 현재 로그인 시도 식별자
 * @returns 현재 시도의 완료 메시지이면 true
 */
export function isPopupLoginMessage(
  data: unknown,
  attempt: string,
): data is { type: string; attempt: string; authenticated: boolean } {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const message = data as Record<string, unknown>;

  return (
    message.type === POPUP_LOGIN_MESSAGE_TYPE &&
    message.attempt === attempt &&
    typeof message.authenticated === 'boolean'
  );
}
