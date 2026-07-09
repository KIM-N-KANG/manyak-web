import { describe, expect, it } from 'vitest';

import { APP_PATH } from '@/constants/app-path';
import {
  buildLoginUrl,
  resolveLoginCallbackUrl,
} from '@/features/auth/login/utils/login-callback-url';

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

  it('제어 문자가 섞인 경로는 기본 경로로 폴백한다 (탭·개행 우회 방지)', () => {
    expect(resolveLoginCallbackUrl('/\t/evil.com')).toBe(APP_PATH.MAIN.STORIES);
    expect(resolveLoginCallbackUrl('/\n/evil.com')).toBe(APP_PATH.MAIN.STORIES);
    expect(resolveLoginCallbackUrl('/\r/evil.com')).toBe(APP_PATH.MAIN.STORIES);
  });
});

describe('buildLoginUrl', () => {
  it('callbackUrl을 인코딩해 로그인 경로에 붙인다', () => {
    expect(buildLoginUrl('/chats/abc-123')).toBe(
      `${APP_PATH.LOGIN}?callbackUrl=${encodeURIComponent('/chats/abc-123')}`,
    );
  });

  it('쿼리·특수문자가 있는 경로도 안전하게 인코딩한다', () => {
    expect(buildLoginUrl('/stories?tab=new&x=1')).toBe(
      `${APP_PATH.LOGIN}?callbackUrl=${encodeURIComponent('/stories?tab=new&x=1')}`,
    );
  });

  it('null·빈 문자열이면 순수 로그인 경로를 반환한다', () => {
    expect(buildLoginUrl(null)).toBe(APP_PATH.LOGIN);
    expect(buildLoginUrl('')).toBe(APP_PATH.LOGIN);
  });
});
