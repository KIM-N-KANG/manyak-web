import { describe, expect, it } from 'vitest';

import { APP_PATH } from '@/constants/app-path';
import { resolveLoginCallbackUrl } from '@/features/auth/login/utils/login-callback-url';

describe('resolveLoginCallbackUrl', () => {
  it('앱 내 상대 경로를 그대로 반환한다', () => {
    expect(resolveLoginCallbackUrl('/chats/abc-123')).toBe('/chats/abc-123');
    expect(resolveLoginCallbackUrl('/stories/new')).toBe('/stories/new');
  });

  it('절대 URL은 기본 경로로 폴백한다 (오픈 리다이렉트 방지)', () => {
    expect(resolveLoginCallbackUrl('https://evil.com')).toBe(
      APP_PATH.MAIN.STORIES,
    );
  });

  it('프로토콜 상대·백슬래시 경로는 기본 경로로 폴백한다', () => {
    expect(resolveLoginCallbackUrl('//evil.com')).toBe(APP_PATH.MAIN.STORIES);
    expect(resolveLoginCallbackUrl('/\\evil.com')).toBe(APP_PATH.MAIN.STORIES);
  });

  it('null·빈 문자열은 기본 경로로 폴백한다', () => {
    expect(resolveLoginCallbackUrl(null)).toBe(APP_PATH.MAIN.STORIES);
    expect(resolveLoginCallbackUrl('')).toBe(APP_PATH.MAIN.STORIES);
  });
});
