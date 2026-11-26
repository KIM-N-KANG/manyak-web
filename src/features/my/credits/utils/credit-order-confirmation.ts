import type { getUsersMeCreditsOrdersByOrderIdResponseSuccess } from '@/api/generated/endpoints/credits/credits';
import { CreditOrderResponseStatus } from '@/api/generated/models';
import { FetchError } from '@/lib/custom-fetch';

/** 주문 조회 간격(ms). 웹훅 적립은 보통 몇 초 안에 끝난다. */
export const CREDIT_ORDER_POLL_INTERVAL_MS = 2_000;

/** 이 횟수(약 60초)까지 PENDING이면 폴링을 멈추고 나중에 다시 확인하게 한다. */
export const CREDIT_ORDER_MAX_ATTEMPTS = 30;

/**
 * 결제 복귀 화면이 그리는 주문 확인 상태.
 * - `checking`: 아직 응답이 없거나 주문이 PENDING이라 폴링을 이어 간다.
 * - `completed`: 적립이 끝났다. `totalCredits`는 서버가 돌려준 이 주문의 이프 수다(없으면 0).
 * - `refunded`: 주문이 환불됐다.
 * - `not-found`: 주문 조회가 404다.
 * - `timeout`: `CREDIT_ORDER_MAX_ATTEMPTS`번 조회해도 PENDING이라 폴링을 멈췄다.
 * - `failed`: 404가 아닌 조회 오류다.
 */
export type CreditOrderConfirmation =
  | { kind: 'checking' }
  | { kind: 'completed'; totalCredits: number }
  | { kind: 'refunded' }
  | { kind: 'not-found' }
  | { kind: 'timeout' }
  | { kind: 'failed' };

type ResolveInput = {
  data: getUsersMeCreditsOrdersByOrderIdResponseSuccess | undefined;
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
