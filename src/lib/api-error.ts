/**
 * API 호출 실패를 표현하는 에러. fetch 레이어와 Sentry 모니터링 양쪽에서 참조하므로
 * 순환 의존을 피하기 위해 별도 모듈로 둔다.
 */
export class FetchError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.data = data;
  }
}

/**
 * FetchError 응답 바디(JSON)에서 앱 수준 에러 코드(`ApiErrorResponse.code`)를 꺼낸다.
 *
 * @param error 검사할 에러 객체
 * @returns 앱 수준 에러 코드. FetchError가 아니거나 바디가 객체가 아니거나 code가 문자열이 아니면 undefined
 */
export function getApiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof FetchError)) {
    return undefined;
  }

  const { data } = error;

  if (typeof data !== 'object' || data === null || !('code' in data)) {
    return undefined;
  }

  const { code } = data as { code?: unknown };

  return typeof code === 'string' ? code : undefined;
}
