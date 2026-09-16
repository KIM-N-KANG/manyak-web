import { describe, expect, it } from 'vitest';

import {
  parsePendingCreditOrder,
  PENDING_CREDIT_ORDER_TTL_MS,
} from '@/features/my/credits/utils/pending-credit-order-storage';

const NOW = 1_800_000_000_000;

describe('parsePendingCreditOrder', () => {
  it('유효한 기록은 그대로 돌려준다', () => {
    expect(
      parsePendingCreditOrder(
        JSON.stringify({ orderId: 'order-1', savedAt: NOW - 1_000 }),
        NOW,
      ),
    ).toEqual({ orderId: 'order-1', savedAt: NOW - 1_000 });
  });

  it('TTL이 지난 기록은 버린다', () => {
    expect(
      parsePendingCreditOrder(
        JSON.stringify({
          orderId: 'order-1',
          savedAt: NOW - PENDING_CREDIT_ORDER_TTL_MS - 1,
        }),
        NOW,
      ),
    ).toBeNull();
  });

  it('없거나 손상되거나 형태가 다른 값은 null이다', () => {
    expect(parsePendingCreditOrder(null, NOW)).toBeNull();
    expect(parsePendingCreditOrder('{', NOW)).toBeNull();
    expect(parsePendingCreditOrder('"order-1"', NOW)).toBeNull();
    expect(
      parsePendingCreditOrder(
        JSON.stringify({ orderId: '', savedAt: NOW }),
        NOW,
      ),
    ).toBeNull();
    expect(
      parsePendingCreditOrder(JSON.stringify({ orderId: 'order-1' }), NOW),
    ).toBeNull();
  });
});
