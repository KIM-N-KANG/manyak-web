import { describe, expect, it } from 'vitest';

import { resolvePushPromptState } from '@/features/my/_shared/utils/push-permission';

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
