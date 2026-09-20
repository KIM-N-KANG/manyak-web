import { expect, it } from 'vitest';

import { parseGuestConsent } from '@/features/auth/_shared/utils/guest-consent-status';

it('누락되거나 잘못된 응답은 거부하고 서버 버전과 동의 상태를 읽는다', () => {
  for (const value of [
    null,
    [],
    {},
    { guestPrivacy: null },
    { guestPrivacy: {} },
    { guestPrivacy: { needsConsent: false } },
    { guestPrivacy: { requiredVersion: ' ', needsConsent: false } },
    { guestPrivacy: { requiredVersion: 'v2', needsConsent: 'false' } },
    { guestPrivacy: { requiredVersion: 'v2' } },
  ]) {
    expect(parseGuestConsent(value)).toBeNull();
  }

  for (const needsConsent of [true, false]) {
    expect(
      parseGuestConsent({
        guestPrivacy: { requiredVersion: 'v2', needsConsent },
      }),
    ).toEqual({ requiredVersion: 'v2', needsConsent });
  }
});
