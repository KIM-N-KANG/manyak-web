import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  GUEST_CONSENT_STORAGE_KEY,
  GUEST_CONSENT_VERSION,
} from '@/features/auth/_shared/constants/guest-consent';
import {
  hasGuestConsent,
  isValidGuestConsent,
  recordGuestConsent,
} from '@/features/auth/_shared/utils/guest-consent-storage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('게스트 동의 기록', () => {
  it('누락, 손상, 구버전과 잘못된 동의 시각은 재동의 대상이다', () => {
    for (const raw of [
      null,
      '',
      '{',
      'true',
      '[]',
      '{}',
      JSON.stringify({ version: 'old', acceptedAt: '2026-09-20' }),
      JSON.stringify({ version: GUEST_CONSENT_VERSION, acceptedAt: 'invalid' }),
    ]) {
      expect(isValidGuestConsent(raw)).toBe(false);
    }

    expect(
      isValidGuestConsent(
        JSON.stringify({
          version: GUEST_CONSENT_VERSION,
          acceptedAt: '2026-09-20T00:00:00.000Z',
        }),
      ),
    ).toBe(true);
  });

  it('저장 후 읽고 다른 탭에서 삭제한 기록은 다음 동작부터 무효가 된다', () => {
    const storage = new Map<string, string>();

    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
    expect(hasGuestConsent()).toBe(false);
    recordGuestConsent();
    expect(hasGuestConsent()).toBe(true);
    expect(JSON.parse(storage.get(GUEST_CONSENT_STORAGE_KEY)!)).toMatchObject({
      version: GUEST_CONSENT_VERSION,
    });
    storage.clear();
    expect(hasGuestConsent()).toBe(false);
  });

  it('저장소 차단은 예외 없이 현재 페이지 메모리에서만 동의한다', () => {
    vi.stubGlobal('window', {
      get localStorage() {
        throw new Error('blocked');
      },
    });
    expect(hasGuestConsent()).toBe(false);
    expect(() => recordGuestConsent()).not.toThrow();
    expect(hasGuestConsent()).toBe(true);
  });
});
