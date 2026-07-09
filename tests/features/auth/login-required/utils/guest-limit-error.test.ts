import { describe, expect, it } from 'vitest';

import { isPaymentRequiredError } from '@/features/auth/login-required/utils/guest-limit-error';
import { FetchError } from '@/lib/custom-fetch';

describe('isPaymentRequiredError', () => {
  it('402 FetchError를 한도 초과로 판정한다', () => {
    expect(isPaymentRequiredError(new FetchError('실패', 402, null))).toBe(
      true,
    );
  });

  it('402가 아닌 status는 거른다', () => {
    expect(isPaymentRequiredError(new FetchError('실패', 500, null))).toBe(
      false,
    );
    expect(isPaymentRequiredError(new FetchError('실패', 401, null))).toBe(
      false,
    );
  });

  it('FetchError가 아닌 값을 거른다', () => {
    expect(isPaymentRequiredError(new Error('실패'))).toBe(false);
    expect(isPaymentRequiredError(undefined)).toBe(false);
    expect(isPaymentRequiredError({ status: 402 })).toBe(false);
  });
});
