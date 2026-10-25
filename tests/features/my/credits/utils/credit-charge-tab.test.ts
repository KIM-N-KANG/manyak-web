import { describe, expect, it } from 'vitest';

import {
  CREDIT_CHARGE_TAB,
  resolveInitialCreditChargeTab,
} from '@/features/my/credits/utils/credit-charge-tab';

describe('resolveInitialCreditChargeTab', () => {
  it('쿼리 값에 맞는 탭을 연다', () => {
    expect(resolveInitialCreditChargeTab('purchase')).toBe(
      CREDIT_CHARGE_TAB.PURCHASE,
    );
    expect(resolveInitialCreditChargeTab('free')).toBe(
      CREDIT_CHARGE_TAB.FREE_CHARGE,
    );
    expect(resolveInitialCreditChargeTab('history')).toBe(
      CREDIT_CHARGE_TAB.HISTORY,
    );
  });

  it('값이 없거나 모르는 값이면 구매 탭을 연다', () => {
    expect(resolveInitialCreditChargeTab(undefined)).toBe(
      CREDIT_CHARGE_TAB.PURCHASE,
    );
    expect(resolveInitialCreditChargeTab('')).toBe(CREDIT_CHARGE_TAB.PURCHASE);
    expect(resolveInitialCreditChargeTab('HISTORY')).toBe(
      CREDIT_CHARGE_TAB.PURCHASE,
    );
    expect(resolveInitialCreditChargeTab('toString')).toBe(
      CREDIT_CHARGE_TAB.PURCHASE,
    );
    expect(resolveInitialCreditChargeTab(['free', 'history'])).toBe(
      CREDIT_CHARGE_TAB.PURCHASE,
    );
  });
});
