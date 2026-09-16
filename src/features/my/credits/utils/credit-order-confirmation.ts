import type { getResponse } from '@/api/generated/endpoints/credits/credits';
import { CreditOrderResponseStatus } from '@/api/generated/models';
import { FetchError } from '@/lib/custom-fetch';

/** 주문 조회 간격(ms). 웹훅 적립은 보통 몇 초 안에 끝난다. */
export const CREDIT_ORDER_POLL_INTERVAL_MS = 2_000;

/** 이 횟수(약 60초)까지 PENDING이면 폴링을 멈추고 나중에 다시 확인하게 한다. */
export const CREDIT_ORDER_MAX_ATTEMPTS = 30;

export type CreditOrderConfirmation =
  | { kind: 'checking' }
  | { kind: 'completed'; totalCredits: number }
  | { kind: 'refunded' }
  | { kind: 'not-found' }
  | { kind: 'timeout' }
  | { kind: 'failed' };

type ResolveInput = {
  data: getResponse | undefined;
  error: unknown;
  /** 지금까지 성공한 조회 횟수 */
  attempts: number;
};

/**
 * 주문 조회 결과를 복귀 화면 상태로 바꾼다.
 *
 * @param input 마지막 응답·오류·조회 횟수
 * @returns 화면이 그릴 확인 상태
 */
export function resolveCreditOrderConfirmation({
  data,
  error,
  attempts,
}: ResolveInput): CreditOrderConfirmation {
  if (error instanceof FetchError && error.status === 404) {
    return { kind: 'not-found' };
  }

  if (error) {
    return { kind: 'failed' };
  }

  if (data?.status !== 200) {
    return { kind: 'checking' };
  }

  switch (data.data.status) {
    case CreditOrderResponseStatus.COMPLETED:
      return { kind: 'completed', totalCredits: data.data.totalCredits ?? 0 };
    case CreditOrderResponseStatus.REFUNDED:
      return { kind: 'refunded' };

    default:
      return attempts >= CREDIT_ORDER_MAX_ATTEMPTS
        ? { kind: 'timeout' }
        : { kind: 'checking' };
  }
}
