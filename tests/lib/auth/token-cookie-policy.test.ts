import { describe, expect, it } from 'vitest';

import {
  computeExpiresAt,
  parseExpiresAt,
  shouldRefreshAccessToken,
} from '@/lib/auth/token-cookie-policy';

describe('computeExpiresAt', () => {
  it('현재 시각에 expiresIn(초)을 ms로 더한다', () => {
    expect(computeExpiresAt(1_000, 1800)).toBe(1_000 + 1800 * 1000);
  });
});

describe('parseExpiresAt', () => {
  it('숫자 문자열을 파싱한다', () => {
    expect(parseExpiresAt('1234567')).toBe(1234567);
  });

  it('없거나 숫자가 아니면 null을 반환한다', () => {
    expect(parseExpiresAt(undefined)).toBeNull();
    expect(parseExpiresAt('')).toBeNull();
    expect(parseExpiresAt('abc')).toBeNull();
  });
});

describe('shouldRefreshAccessToken', () => {
  const expiresAt = 100_000;

  it('만료 60초 전부터 재발급 대상이다', () => {
    expect(shouldRefreshAccessToken(expiresAt, expiresAt - 60_000)).toBe(true);
    expect(shouldRefreshAccessToken(expiresAt, expiresAt + 1)).toBe(true);
  });

  it('만료까지 60초 넘게 남았으면 재발급하지 않는다', () => {
    expect(shouldRefreshAccessToken(expiresAt, expiresAt - 60_001)).toBe(false);
  });
});
