import { describe, expect, it } from 'vitest';

import {
  isIosDevice,
  resolvePushPromptState,
} from '@/features/my/_shared/utils/push-permission';

describe('isIosDevice', () => {
  it('iPhone·iPad UA는 iOS다', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 5)).toBe(
      true,
    );
    expect(isIosDevice('Mozilla/5.0 (iPad; CPU OS 16_4)', 5)).toBe(true);
  });

  it('데스크톱 UA의 iPadOS는 터치 포인트로 잡는다', () => {
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5)).toBe(
      true,
    );
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 0)).toBe(
      false,
    );
  });

  it('Android는 iOS가 아니다', () => {
    expect(isIosDevice('Mozilla/5.0 (Linux; Android 14)', 5)).toBe(false);
  });
});

describe('resolvePushPromptState', () => {
  it('iOS 비설치본은 권한과 무관하게 설치 안내다', () => {
    expect(
      resolvePushPromptState({
        permission: 'default',
        isIos: true,
        isStandalone: false,
      }),
    ).toBe('install');
  });

  it('iOS 설치본은 권한 상태를 따른다', () => {
    expect(
      resolvePushPromptState({
        permission: 'default',
        isIos: true,
        isStandalone: true,
      }),
    ).toBe('prompt');
  });

  it('default는 요청 가능, 그 외는 권한 상태 그대로다', () => {
    const base = { isIos: false, isStandalone: false };

    expect(resolvePushPromptState({ ...base, permission: 'default' })).toBe(
      'prompt',
    );
    expect(resolvePushPromptState({ ...base, permission: 'granted' })).toBe(
      'granted',
    );
    expect(resolvePushPromptState({ ...base, permission: 'denied' })).toBe(
      'denied',
    );
    expect(resolvePushPromptState({ ...base, permission: 'unsupported' })).toBe(
      'unsupported',
    );
  });
});
