import { describe, expect, it } from 'vitest';

import { detectInAppBrowser } from '@/lib/in-app-browser';

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
