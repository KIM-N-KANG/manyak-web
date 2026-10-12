import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  APP_BANNER_DISMISSED_KEY,
  APP_BANNER_SESSION_KEY,
  APP_BANNER_VISITS_KEY,
  type AppBannerVariant,
  buildAppIntentUrl,
  dismissAppBanner,
  isAppBannerDismissed,
  parseStoryDetailId,
  recordSessionVisit,
  resolveAppBannerVariant,
  shouldShowAppBanner,
  supportsHomeScreenImageGuide,
} from '@/lib/app-banner';

const UA = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.54 Mobile Safari/537.36',
  samsungInternet:
    'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  androidKakao:
    'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.54 Mobile Safari/537.36;KAKAOTALK 2610420',
  androidNaver:
    'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.54 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.10.3)',
  androidWebView:
    'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.54 Mobile Safari/537.36',
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  iosChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
  iosSafari18:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iPadSafari26:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  iosFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15',
  iosKakao:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0',
  iosInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 334.0.0.28.93',
  iosUnknownApp:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  googlebotMobile:
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.70 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};

/**
 * 기본값(터치 없음, 설치본 아님, 홈)에 덮어쓸 값만 받아 판정한다.
 *
 * @param userAgent 판정할 User-Agent
 * @param overrides 덮어쓸 입력
 * @returns 판정한 변형
 */
function resolve(
  userAgent: string,
  overrides: Partial<Parameters<typeof resolveAppBannerVariant>[0]> = {},
) {
  return resolveAppBannerVariant({
    userAgent,
    maxTouchPoints: 0,
    isStandalone: false,
    pathname: '/',
    ...overrides,
  });
}

/**
 * Map으로 동작하는 Storage 스텁을 만든다.
 *
 * @param initial 처음 담아 둘 값
 * @returns Storage 스텁
 */
function createStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  } as Storage;
}

const blockedStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
} as unknown as Storage;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveAppBannerVariant', () => {
  it.each([
    {
      label: '카카오톡 Android',
      userAgent: UA.androidKakao,
      expected: 'android_inapp',
    },
    {
      label: '네이버 Android',
      userAgent: UA.androidNaver,
      expected: 'android_inapp',
    },
    {
      label: 'Android WebView',
      userAgent: UA.androidWebView,
      expected: 'android_inapp',
    },
    {
      label: 'Android Chrome',
      userAgent: UA.androidChrome,
      expected: 'android_browser',
    },
    {
      label: '삼성 인터넷',
      userAgent: UA.samsungInternet,
      expected: 'android_browser',
    },
    { label: '카카오톡 iOS', userAgent: UA.iosKakao, expected: 'ios_inapp' },
    {
      label: '인스타그램 iOS',
      userAgent: UA.iosInstagram,
      expected: 'ios_inapp',
    },
    {
      label: 'Safari 토큰 없는 iOS 앱',
      userAgent: UA.iosUnknownApp,
      expected: 'ios_inapp',
    },
    { label: 'iOS Safari', userAgent: UA.iosSafari, expected: 'ios_browser' },
    { label: 'iOS Chrome', userAgent: UA.iosChrome, expected: 'ios_browser' },
  ] satisfies {
    label: string;
    userAgent: string;
    expected: AppBannerVariant;
  }[])('$label는 $expected로 판정한다', ({ userAgent, expected }) => {
    expect(resolve(userAgent)).toBe(expected);
  });

  it('데스크톱 UA의 iPadOS는 터치 포인트로 iOS 브라우저로 판정한다', () => {
    expect(resolve(UA.macSafari, { maxTouchPoints: 5 })).toBe('ios_browser');
    expect(resolve(UA.macSafari, { maxTouchPoints: 0 })).toBeNull();
  });

  it.each([
    { label: '데스크톱 Chrome', userAgent: UA.windowsChrome },
    { label: '모바일 Googlebot', userAgent: UA.googlebotMobile },
    { label: 'iOS Firefox', userAgent: UA.iosFirefox },
  ])('$label에는 띄우지 않는다', ({ userAgent }) => {
    expect(resolve(userAgent)).toBeNull();
  });

  it('홈 화면 설치본에는 띄우지 않는다', () => {
    expect(resolve(UA.androidChrome, { isStandalone: true })).toBeNull();
    expect(resolve(UA.iosSafari, { isStandalone: true })).toBeNull();
  });

  it.each(['/about', '/terms', '/privacy'])(
    '문서 화면 %s에는 띄우지 않는다',
    (pathname) => {
      expect(resolve(UA.androidWebView, { pathname })).toBeNull();
    },
  );
});

describe('supportsHomeScreenImageGuide', () => {
  it('iPhone Safari 26 이상은 스크린샷 안내를 쓴다', () => {
    expect(supportsHomeScreenImageGuide(UA.iosSafari)).toBe(true);
  });

  it.each([
    { label: 'iOS Chrome', userAgent: UA.iosChrome },
    { label: 'iOS 18 Safari', userAgent: UA.iosSafari18 },
    { label: 'iPadOS Safari 26', userAgent: UA.iPadSafari26 },
  ])('$label는 텍스트 안내를 쓴다', ({ userAgent }) => {
    expect(supportsHomeScreenImageGuide(userAgent)).toBe(false);
  });
});

describe('shouldShowAppBanner', () => {
  it.each([
    [1, true],
    [2, false],
    [3, true],
    [4, false],
  ])('자체 브라우저는 %i번째 접속에서 노출 여부가 %s다', (visit, expected) => {
    expect(shouldShowAppBanner('android_browser', visit, false)).toBe(expected);
    expect(shouldShowAppBanner('ios_browser', visit, false)).toBe(expected);
  });

  it.each([1, 2, 3, 4])('인앱은 %i번째 접속에도 노출한다', (visit) => {
    expect(shouldShowAppBanner('android_inapp', visit, false)).toBe(true);
    expect(shouldShowAppBanner('ios_inapp', visit, false)).toBe(true);
  });

  it('이번 접속에서 닫았으면 노출하지 않는다', () => {
    expect(shouldShowAppBanner('android_inapp', 1, true)).toBe(false);
    expect(shouldShowAppBanner('ios_browser', 3, true)).toBe(false);
  });
});

describe('parseStoryDetailId', () => {
  it('스토리 상세 경로에서 스토리 ID를 읽는다', () => {
    expect(parseStoryDetailId('/stories/abc')).toBe('abc');
  });

  it.each(['/', '/stories/new', '/stories/abc/edit', '/chats/1', '/my'])(
    '%s는 스토리 상세가 아니다',
    (pathname) => {
      expect(parseStoryDetailId(pathname)).toBeNull();
    },
  );
});

describe('buildAppIntentUrl', () => {
  const tail =
    '#Intent;scheme=https;package=app.manyak;S.market_referrer=utm_source%3Dmanyak_web%26utm_medium%3Dapp_banner;end';

  it('스토리 상세에서는 앱의 그 스토리를 연다', () => {
    expect(buildAppIntentUrl('/stories/abc')).toBe(
      `intent://manyak.app/stories/abc${tail}`,
    );
  });

  it.each(['/', '/stories/abc/edit', '/stories/new', '/chats/1'])(
    '%s에서는 앱 홈을 연다',
    (pathname) => {
      expect(buildAppIntentUrl(pathname)).toBe(`intent://manyak.app/${tail}`);
    },
  );
});

describe('접속 회차와 닫기 저장', () => {
  it('새 탭의 첫 판정에서 누적 접속 수를 올리고 같은 탭에서는 다시 세지 않는다', () => {
    const localStorage = createStorage({ [APP_BANNER_VISITS_KEY]: '2' });
    const sessionStorage = createStorage();

    vi.stubGlobal('window', { localStorage, sessionStorage });

    expect(recordSessionVisit()).toBe(3);
    expect(recordSessionVisit()).toBe(3);
    expect(localStorage.getItem(APP_BANNER_VISITS_KEY)).toBe('3');
    expect(sessionStorage.getItem(APP_BANNER_SESSION_KEY)).toBe('3');
  });

  it.each(['abc', '-1', '1.5'])(
    '누적 값 %s가 손상됐으면 첫 접속으로 센다',
    (stored) => {
      vi.stubGlobal('window', {
        localStorage: createStorage({ [APP_BANNER_VISITS_KEY]: stored }),
        sessionStorage: createStorage(),
      });

      expect(recordSessionVisit()).toBe(1);
    },
  );

  it('닫으면 같은 탭에서 닫힘으로 읽는다', () => {
    const sessionStorage = createStorage();

    vi.stubGlobal('window', { localStorage: createStorage(), sessionStorage });

    expect(isAppBannerDismissed()).toBe(false);
    dismissAppBanner();
    expect(isAppBannerDismissed()).toBe(true);
    expect(sessionStorage.getItem(APP_BANNER_DISMISSED_KEY)).toBe('1');
  });

  it('저장소를 쓸 수 없으면 첫 접속, 닫지 않음으로 보고 오류를 내지 않는다', () => {
    vi.stubGlobal('window', {
      localStorage: blockedStorage,
      sessionStorage: blockedStorage,
    });

    expect(recordSessionVisit()).toBe(1);
    expect(isAppBannerDismissed()).toBe(false);
    expect(() => dismissAppBanner()).not.toThrow();
  });
});
