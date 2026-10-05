import { describe, expect, it, vi } from 'vitest';

import type { SocialAuthResponse } from '@/api/generated/models';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

import {
  parsePendingSignupConsent,
  toPendingSignupConsent,
} from '@/lib/auth/signup-consent-cookie';

const NOW = Date.parse('2026-10-05T00:00:00Z');

const CONSENTS = {
  terms: { requiredVersion: 'v1.2', needsConsent: true },
  privacy: { requiredVersion: 'v1.4', needsConsent: false },
  age14: { requiredVersion: '1', needsConsent: true },
};

const PENDING = {
  consentToken: 'pending-code',
  expiresAt: '2026-10-05T00:10:00Z',
  consents: CONSENTS,
};

describe('toPendingSignupConsent', () => {
  it('CONSENT_REQUIRED 응답에서 대기 코드, 만료 시각, 동의 상태만 고른다', () => {
    const response: SocialAuthResponse = {
      status: 'CONSENT_REQUIRED',
      isNewUser: true,
      ...PENDING,
    };

    expect(toPendingSignupConsent(response)).toEqual(PENDING);
  });

  it.each<Partial<SocialAuthResponse>>([
    { consentToken: null },
    { expiresAt: null },
    { consents: null },
    { consents: { terms: { requiredVersion: 'v1.2', needsConsent: false } } },
  ])('필수 값이 없거나 동의할 항목이 없으면 null이다(%o)', (override) => {
    expect(
      toPendingSignupConsent({
        status: 'CONSENT_REQUIRED',
        ...PENDING,
        ...override,
      }),
    ).toBeNull();
  });
});

describe('parsePendingSignupConsent', () => {
  it('유효한 쿠키 값을 복원한다', () => {
    expect(parsePendingSignupConsent(JSON.stringify(PENDING), NOW)).toEqual(
      PENDING,
    );
  });

  it.each([
    undefined,
    '',
    'not-json',
    '[]',
    'null',
    JSON.stringify({ ...PENDING, consentToken: 1 }),
    JSON.stringify({ ...PENDING, consents: null }),
    JSON.stringify({ ...PENDING, expiresAt: 'not-a-date' }),
  ])('손상된 값 %s는 null이다', (raw) => {
    expect(parsePendingSignupConsent(raw, NOW)).toBeNull();
  });

  it('만료 시각이 지났으면 null이다', () => {
    expect(
      parsePendingSignupConsent(
        JSON.stringify(PENDING),
        Date.parse('2026-10-05T00:10:00Z'),
      ),
    ).toBeNull();
  });
});
