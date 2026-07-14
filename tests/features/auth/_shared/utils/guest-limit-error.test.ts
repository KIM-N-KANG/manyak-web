import { describe, expect, it } from 'vitest';

import { API_ERROR_CODE } from '@/constants/api-error-code';
import {
  isPaymentRequiredError,
  resolvePaymentRequiredReason,
} from '@/features/auth/_shared/utils/guest-limit-error';
import { FetchError } from '@/lib/custom-fetch';

const fetchError = (status: number, data?: unknown) =>
  new FetchError('실패', status, data);

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

describe('resolvePaymentRequiredReason', () => {
  it('code가 GUEST_TRIAL_LIMIT_EXCEEDED면 세션과 무관하게 guest-trial-limit', () => {
    const error = fetchError(402, {
      code: API_ERROR_CODE.GUEST_TRIAL_LIMIT_EXCEEDED,
    });

    expect(resolvePaymentRequiredReason(error, 'authenticated')).toBe(
      'guest-trial-limit',
    );
  });

  it('code가 INSUFFICIENT_CREDIT면 세션과 무관하게 insufficient-credit', () => {
    const error = fetchError(402, {
      code: API_ERROR_CODE.INSUFFICIENT_CREDIT,
    });

    expect(resolvePaymentRequiredReason(error, 'unauthenticated')).toBe(
      'insufficient-credit',
    );
  });

  it('code 없는 402 + 미로그인은 게스트 한도로 폴백', () => {
    expect(
      resolvePaymentRequiredReason(fetchError(402), 'unauthenticated'),
    ).toBe('guest-trial-limit');
  });

  it('code 없는 402 + 로그인/세션 미확정은 크레딧 부족으로 폴백', () => {
    expect(resolvePaymentRequiredReason(fetchError(402), 'authenticated')).toBe(
      'insufficient-credit',
    );
    expect(resolvePaymentRequiredReason(fetchError(402), 'loading')).toBe(
      'insufficient-credit',
    );
  });

  it('알 수 없는 code 문자열은 세션 기반 폴백을 따른다', () => {
    const error = fetchError(402, { code: 'SOMETHING_ELSE' });

    expect(resolvePaymentRequiredReason(error, 'unauthenticated')).toBe(
      'guest-trial-limit',
    );
  });

  it('402가 아니면 null', () => {
    expect(
      resolvePaymentRequiredReason(fetchError(500), 'unauthenticated'),
    ).toBeNull();
  });
});
