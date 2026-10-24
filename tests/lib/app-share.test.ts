import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_PATH } from '@/constants/app-path';
import { APP_OPEN_FALLBACK_DELAY_MS } from '@/lib/app-banner';
import {
  APP_SHARE_PLAY_STORE_URL,
  APP_SHARE_REDIRECTED_KEY,
  startAppShareRedirect,
} from '@/lib/app-share';

const UA = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.54 Mobile Safari/537.36',
  androidKakao:
    'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.54 Mobile Safari/537.36;KAKAOTALK 2610420',
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
};

type Stub = {
  location: { href: string; replace: ReturnType<typeof vi.fn> };
  sessionStorage: Map<string, string>;
  setVisibility: (state: 'visible' | 'hidden') => void;
};

/**
 * window, document, navigator를 스텁한다. 타이머는 가짜 타이머를 쓴다.
 *
 * @param stored sessionStorage에 미리 담아 둘 값
 * @returns 이동 결과를 읽을 스텁 핸들
 */
function stubBrowser(stored: Record<string, string> = {}): Stub {
  const sessionStorage = new Map(Object.entries(stored));
  const location = { href: 'https://manyak.app/app', replace: vi.fn() };
  const listeners = new Set<() => void>();
  const document = {
    visibilityState: 'visible' as 'visible' | 'hidden',
    addEventListener: (_: string, listener: () => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_: string, listener: () => void) => {
      listeners.delete(listener);
    },
  };

  vi.stubGlobal('window', {
    location,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    sessionStorage: {
      getItem: (key: string) => sessionStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        sessionStorage.set(key, value);
      },
    },
  });
  vi.stubGlobal('document', document);
  vi.stubGlobal('navigator', { userAgent: UA.androidChrome });

  return {
    location,
    sessionStorage,
    setVisibility: (state) => {
      document.visibilityState = state;
      [...listeners].forEach((listener) => listener());
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('startAppShareRedirect', () => {
  it('Android가 아니면 웹 홈으로 교체 이동한다', () => {
    const stub = stubBrowser();

    expect(startAppShareRedirect(UA.iosSafari)).toBeNull();
    expect(stub.location.replace).toHaveBeenCalledWith(APP_PATH.MAIN.STORIES);
    expect(stub.sessionStorage.get(APP_SHARE_REDIRECTED_KEY)).toBe('1');
  });

  it('Android는 intent 링크로 앱을 열고 지연 뒤 플레이스토어로 교체 이동한다', () => {
    const stub = stubBrowser();

    startAppShareRedirect(UA.androidChrome);

    expect(stub.location.href).toMatch(/^intent:\/\/manyak\.app\/#Intent;/);
    expect(stub.location.href).toContain('utm_medium%3Dshare_link');
    expect(stub.location.replace).not.toHaveBeenCalled();

    vi.advanceTimersByTime(APP_OPEN_FALLBACK_DELAY_MS);

    expect(stub.location.replace).toHaveBeenCalledWith(
      APP_SHARE_PLAY_STORE_URL,
    );
    expect(APP_SHARE_PLAY_STORE_URL).toContain('utm_medium%3Dshare_link');
  });

  it('앱으로 전환돼 문서가 숨겨지면 플레이스토어로 보내지 않는다', () => {
    const stub = stubBrowser();

    startAppShareRedirect(UA.androidChrome);
    stub.setVisibility('hidden');
    vi.advanceTimersByTime(APP_OPEN_FALLBACK_DELAY_MS * 2);

    expect(stub.location.replace).not.toHaveBeenCalled();
  });

  it('카카오톡 인앱은 카카오 스킴으로 플레이스토어를 먼저 열고 그다음 교체 이동한다', () => {
    const stub = stubBrowser();

    startAppShareRedirect(UA.androidKakao);
    vi.advanceTimersByTime(APP_OPEN_FALLBACK_DELAY_MS);

    expect(stub.location.href).toBe(
      `kakaotalk://web/openExternal?url=${encodeURIComponent(APP_SHARE_PLAY_STORE_URL)}`,
    );
    expect(stub.location.replace).not.toHaveBeenCalled();

    vi.advanceTimersByTime(APP_OPEN_FALLBACK_DELAY_MS);

    expect(stub.location.replace).toHaveBeenCalledWith(
      APP_SHARE_PLAY_STORE_URL,
    );
  });

  it('반환한 함수로 폴백을 취소할 수 있다', () => {
    const stub = stubBrowser();

    startAppShareRedirect(UA.androidChrome)?.();
    vi.advanceTimersByTime(APP_OPEN_FALLBACK_DELAY_MS);

    expect(stub.location.replace).not.toHaveBeenCalled();
  });

  it('같은 탭에서 이미 이동했으면 다시 이동하지 않는다', () => {
    const stub = stubBrowser({ [APP_SHARE_REDIRECTED_KEY]: '1' });

    expect(startAppShareRedirect(UA.androidChrome)).toBeNull();
    vi.advanceTimersByTime(APP_OPEN_FALLBACK_DELAY_MS);

    expect(stub.location.href).toBe('https://manyak.app/app');
    expect(stub.location.replace).not.toHaveBeenCalled();
  });
});
