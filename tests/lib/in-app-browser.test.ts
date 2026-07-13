import { describe, expect, it } from 'vitest';

import { isKakaoTalkInAppBrowser } from '@/lib/in-app-browser';

describe('isKakaoTalkInAppBrowser', () => {
  it('카카오톡 iOS 인앱 브라우저 UA를 감지한다', () => {
    expect(
      isKakaoTalkInAppBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0',
      ),
    ).toBe(true);
  });

  it('카카오톡 Android 인앱 브라우저 UA를 감지한다', () => {
    expect(
      isKakaoTalkInAppBrowser(
        'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.54 Mobile Safari/537.36;KAKAOTALK 2610420',
      ),
    ).toBe(true);
  });

  it('일반 모바일 Safari UA는 감지하지 않는다', () => {
    expect(
      isKakaoTalkInAppBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(false);
  });

  it('일반 Android Chrome UA는 감지하지 않는다', () => {
    expect(
      isKakaoTalkInAppBrowser(
        'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.54 Mobile Safari/537.36',
      ),
    ).toBe(false);
  });

  it('빈 문자열은 감지하지 않는다', () => {
    expect(isKakaoTalkInAppBrowser('')).toBe(false);
  });
});
