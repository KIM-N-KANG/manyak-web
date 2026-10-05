import { describe, expect, it } from 'vitest';

import {
  isSignupConsentSummary,
  SIGNUP_CONSENT_ERROR,
  toSignupConsentErrorCode,
} from '@/lib/auth/signup-consent';

describe('toSignupConsentErrorCode', () => {
  it.each(Object.values(SIGNUP_CONSENT_ERROR))(
    '알려진 code %s는 그대로 쓴다',
    (code) => {
      expect(toSignupConsentErrorCode(code)).toBe(code);
    },
  );

  it.each([undefined, null, 'credentials', 1])(
    '모르는 값 %s는 재시도 가능한 실패로 본다',
    (value) => {
      expect(toSignupConsentErrorCode(value)).toBe(
        SIGNUP_CONSENT_ERROR.RETRYABLE,
      );
    },
  );
});

describe('isSignupConsentSummary', () => {
  it('동의 상태 객체와 만료 시각 문자열이 있으면 요약이다', () => {
    expect(
      isSignupConsentSummary({
        consents: { terms: { requiredVersion: 'v1', needsConsent: true } },
        expiresAt: '2026-10-05T00:10:00Z',
      }),
    ).toBe(true);
  });

  it.each([
    null,
    [],
    'x',
    { consents: null, expiresAt: '2026-10-05T00:10:00Z' },
    { consents: [], expiresAt: '2026-10-05T00:10:00Z' },
    { consents: {} },
  ])('형식이 다르면 요약이 아니다(%o)', (value) => {
    expect(isSignupConsentSummary(value)).toBe(false);
  });
});
