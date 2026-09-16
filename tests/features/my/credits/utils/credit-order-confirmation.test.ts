import { describe, expect, it } from 'vitest';

import type { getResponse } from '@/api/generated/endpoints/credits/credits';
import {
  CREDIT_ORDER_MAX_ATTEMPTS,
  resolveCreditOrderConfirmation,
} from '@/features/my/credits/utils/credit-order-confirmation';
import { FetchError } from '@/lib/custom-fetch';

function order(status: 'PENDING' | 'COMPLETED' | 'REFUNDED'): getResponse {
  return {
    status: 200,
    headers: new Headers(),
    data: { orderId: 'order-1', status, totalCredits: 5_000 },
  };
}

describe('resolveCreditOrderConfirmation', () => {
  it('응답 전에는 확인 중이다', () => {
    expect(
      resolveCreditOrderConfirmation({
        data: undefined,
        error: null,
        attempts: 0,
      }),
    ).toEqual({ kind: 'checking' });
  });

  it('PENDING은 최대 횟수 전까지 확인 중이고 넘기면 시간 초과다', () => {
    expect(
      resolveCreditOrderConfirmation({
        data: order('PENDING'),
        error: null,
        attempts: CREDIT_ORDER_MAX_ATTEMPTS - 1,
      }),
    ).toEqual({ kind: 'checking' });
    expect(
      resolveCreditOrderConfirmation({
        data: order('PENDING'),
        error: null,
        attempts: CREDIT_ORDER_MAX_ATTEMPTS,
      }),
    ).toEqual({ kind: 'timeout' });
  });

  it('COMPLETED는 적립 총량과 함께 완료다', () => {
    expect(
      resolveCreditOrderConfirmation({
        data: order('COMPLETED'),
        error: null,
        attempts: 3,
      }),
    ).toEqual({ kind: 'completed', totalCredits: 5_000 });
  });

  it('REFUNDED는 환불이다', () => {
    expect(
      resolveCreditOrderConfirmation({
        data: order('REFUNDED'),
        error: null,
        attempts: 1,
      }),
    ).toEqual({ kind: 'refunded' });
  });

  it('404는 없는 주문, 다른 오류는 실패다', () => {
    expect(
      resolveCreditOrderConfirmation({
        data: undefined,
        error: new FetchError('not found', 404, null),
        attempts: 1,
      }),
    ).toEqual({ kind: 'not-found' });
    expect(
      resolveCreditOrderConfirmation({
        data: undefined,
        error: new Error('network'),
        attempts: 1,
      }),
    ).toEqual({ kind: 'failed' });
  });
});
