import { describe, expect, it } from 'vitest';

import {
  buildPushSettingsUpdate,
  normalizePushSettings,
  resolvePushConsentNotice,
} from '@/features/my/_shared/utils/push-settings';

describe('normalizePushSettings', () => {
  it('빈 응답은 서비스 켜짐·광고·야간 꺼짐이다', () => {
    expect(normalizePushSettings(undefined)).toEqual({
      servicePush: true,
      marketingPush: false,
      marketingNightPush: false,
    });
  });
});

describe('buildPushSettingsUpdate', () => {
  const on = {
    servicePush: true,
    marketingPush: true,
    marketingNightPush: true,
  };

  it('광고를 끄면 야간도 함께 꺼진다', () => {
    expect(buildPushSettingsUpdate(on, { marketingPush: false })).toEqual({
      servicePush: true,
      marketingPush: false,
      marketingNightPush: false,
    });
  });

  it('서비스 알림만 바꾸면 광고·야간은 그대로다', () => {
    expect(buildPushSettingsUpdate(on, { servicePush: false })).toEqual({
      ...on,
      servicePush: false,
    });
  });
});

describe('resolvePushConsentNotice', () => {
  const off = {
    servicePush: true,
    marketingPush: false,
    marketingNightPush: false,
  };

  it('광고 동의·철회를 통지한다', () => {
    expect(resolvePushConsentNotice(off, { ...off, marketingPush: true })).toBe(
      'marketingOn',
    );
    expect(
      resolvePushConsentNotice(
        { ...off, marketingPush: true, marketingNightPush: true },
        off,
      ),
    ).toBe('marketingOff');
  });

  it('야간 동의·철회를 통지하고 서비스 토글은 통지하지 않는다', () => {
    const marketing = { ...off, marketingPush: true };

    expect(
      resolvePushConsentNotice(marketing, {
        ...marketing,
        marketingNightPush: true,
      }),
    ).toBe('nightOn');
    expect(
      resolvePushConsentNotice(off, { ...off, servicePush: false }),
    ).toBeNull();
  });
});
