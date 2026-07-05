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
