import { FetchError } from '@/lib/custom-fetch';

/**
 * 에러가 체험 한도 초과(402 Payment Required) 응답인지 판정한다.
 * 게스트 여부 판정은 세션을 아는 호출부 책임이다.
 */
export function isPaymentRequiredError(error: unknown): boolean {
  return error instanceof FetchError && error.status === 402;
}
