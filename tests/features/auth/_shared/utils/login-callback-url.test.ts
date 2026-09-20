import { afterEach, describe, expect, it, vi } from 'vitest';

import { APP_PATH } from '@/constants/app-path';
import {
  buildLoginUrl,
  readCurrentAppPath,
  resolveLoginCallbackUrl,
  toAppPath,
} from '@/features/auth/_shared/utils/login-callback-url';

afterEach(() => vi.unstubAllGlobals());

describe('resolveLoginCallbackUrl', () => {
  it('앱 내 상대 경로를 그대로 반환한다', () => {
    expect(resolveLoginCallbackUrl('/chats/abc-123')).toBe('/chats/abc-123');
    expect(resolveLoginCallbackUrl(APP_PATH.STUDIO.STORY.SIMPLE)).toBe(
      APP_PATH.STUDIO.STORY.SIMPLE,
    );
  });

  it('쿼리·해시가 붙은 상대 경로도 그대로 보존한다', () => {
    expect(resolveLoginCallbackUrl('/stories/s1?setting=2#endings')).toBe(
      '/stories/s1?setting=2#endings',
    );
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

describe('toAppPath·readCurrentAppPath', () => {
  it('pathname·search·hash를 이어 복귀 경로를 만든다', () => {
    expect(
      toAppPath({ pathname: '/stories/s1', search: '?setting=2', hash: '#e' }),
    ).toBe('/stories/s1?setting=2#e');
    expect(toAppPath({ pathname: '/', search: '', hash: '' })).toBe('/');
  });

  it('현재 문서 위치 전체를 읽고, 그 값은 복귀 경로 검증을 통과한다', () => {
    vi.stubGlobal('window', {
      location: { pathname: '/chats/c1', search: '?x=1', hash: '#top' },
    });

    expect(readCurrentAppPath()).toBe('/chats/c1?x=1#top');
    expect(resolveLoginCallbackUrl(readCurrentAppPath())).toBe(
      '/chats/c1?x=1#top',
    );
  });

  it('브라우저 밖에서는 null이라 기본 경로로 폴백한다', () => {
    expect(readCurrentAppPath()).toBeNull();
    expect(resolveLoginCallbackUrl(readCurrentAppPath())).toBe(
      APP_PATH.MAIN.STORIES,
    );
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
