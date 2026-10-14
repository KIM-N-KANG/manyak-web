import { describe, expect, it } from 'vitest';

import { detectInAppBrowser, isInAppBrowser } from '@/lib/in-app-browser';

describe('detectInAppBrowser', () => {
  it('카카오톡 iOS 인앱 브라우저 UA를 감지한다', () => {
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0',
      ),
    ).toBe('kakaotalk');
  });

  it('카카오톡 Android 인앱 브라우저 UA를 감지한다', () => {
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.54 Mobile Safari/537.36;KAKAOTALK 2610420',
      ),
    ).toBe('kakaotalk');
  });

  it('인스타그램 iOS 인앱 브라우저 UA를 감지한다', () => {
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 334.0.0.28.93 (iPhone15,3; iOS 17_5; ko_KR; ko; scale=3.00; 1290x2796; 605596711)',
      ),
    ).toBe('instagram');
  });

  it('인스타그램 Android 인앱 브라우저 UA를 감지한다', () => {
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.54 Mobile Safari/537.36 Instagram 334.0.0.28.93 Android (34/14; 480dpi; 1080x2340; samsung; SM-S921N; e1s; s5e9945; ko_KR; 605596711)',
      ),
    ).toBe('instagram');
  });

  it('쓰레드 iOS 인앱 브라우저 UA를 감지한다', () => {
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 289.0.0.77.109 (iPhone15,3; iOS 17_5; ko_KR; ko; scale=3.00; 1290x2796; 489720161)',
      ),
    ).toBe('threads');
  });

  it('쓰레드 Android 인앱 브라우저 UA를 감지한다', () => {
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.54 Mobile Safari/537.36 Barcelona 289.0.0.77.109 Android',
      ),
    ).toBe('threads');
  });

  it('일반 모바일 Safari UA는 감지하지 않는다', () => {
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      ),
    ).toBeNull();
  });

  it('일반 Android Chrome UA는 감지하지 않는다', () => {
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.54 Mobile Safari/537.36',
      ),
    ).toBeNull();
  });

  it('빈 문자열은 감지하지 않는다', () => {
    expect(detectInAppBrowser('')).toBeNull();
  });
});

describe('isInAppBrowser', () => {
  it.each([
    [
      '카카오톡',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0',
    ],
    [
      '인스타그램',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 334.0.0.28.93',
    ],
    [
      '쓰레드',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 334.0.0.28.93',
    ],
    [
      '페이스북',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.38.108]',
    ],
    [
      '라인',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.12.0',
    ],
    [
      '네이버',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.10.3)',
    ],
    [
      '다음',
      'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.54 Mobile Safari/537.36 DaumApps/5.6.1',
    ],
    [
      '밴드',
      'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.54 Mobile Safari/537.36 BAND/16.2.0',
    ],
    [
      'Android WebView',
      'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.54 Mobile Safari/537.36',
    ],
  ])('%s UA는 인앱 브라우저다', (_, userAgent) => {
    expect(isInAppBrowser(userAgent)).toBe(true);
  });

  it.each([
    [
      'Android Chrome',
      'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.54 Mobile Safari/537.36',
    ],
    [
      '삼성 인터넷',
      'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
    ],
    [
      'iOS Safari',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
    ],
  ])('%s UA는 인앱 브라우저가 아니다', (_, userAgent) => {
    expect(isInAppBrowser(userAgent)).toBe(false);
  });
});
