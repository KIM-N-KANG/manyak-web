import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getDeviceIdMock = vi.fn();
const getSessionIdMock = vi.fn();

vi.mock('@amplitude/unified', () => ({
  getDeviceId: () => getDeviceIdMock(),
  getSessionId: () => getSessionIdMock(),
}));

import {
  DEVICE_ID_HEADER,
  getAnalyticsIdentityHeaders,
  SESSION_ID_HEADER,
} from '@/observability/analytics/identity';

// Amplitude가 저장하는 쿠키와 같은 형식(base64 → URL 인코드 → JSON)으로 만든다.
const ampCookie = (state: { deviceId?: string; sessionId?: number }) =>
  `AMP_test=${btoa(encodeURIComponent(JSON.stringify(state)))}`;

const stubBrowser = (cookie = '') => {
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', { cookie });
};

describe('getAnalyticsIdentityHeaders', () => {
  beforeEach(() => {
    getDeviceIdMock.mockReset();
    getSessionIdMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('서버 사이드(window 없음)에서는 SDK를 호출하지 않고 빈 객체를 반환한다', () => {
    getDeviceIdMock.mockReturnValue('d1');
    getSessionIdMock.mockReturnValue(123);

    expect(getAnalyticsIdentityHeaders()).toEqual({});
    expect(getDeviceIdMock).not.toHaveBeenCalled();
    expect(getSessionIdMock).not.toHaveBeenCalled();
  });

  it('SDK가 준비되면 SDK 값을 싣고 쿠키는 참조하지 않는다', () => {
    stubBrowser(ampCookie({ deviceId: 'cookie-d', sessionId: 999 }));
    getDeviceIdMock.mockReturnValue('device-1');
    getSessionIdMock.mockReturnValue(1717777777);

    expect(getAnalyticsIdentityHeaders()).toEqual({
      [DEVICE_ID_HEADER]: 'device-1',
      [SESSION_ID_HEADER]: '1717777777',
    });
  });

  it('SDK 미초기화 시 쿠키에서 device_id·session_id를 폴백으로 읽는다', () => {
    stubBrowser(
      ampCookie({ deviceId: 'cookie-device', sessionId: 1782715658700 }),
    );
    getDeviceIdMock.mockReturnValue(undefined);
    getSessionIdMock.mockReturnValue(undefined);

    expect(getAnalyticsIdentityHeaders()).toEqual({
      [DEVICE_ID_HEADER]: 'cookie-device',
      [SESSION_ID_HEADER]: '1782715658700',
    });
  });

  it('일부 값만 비면 비는 값만 쿠키로 보완한다', () => {
    stubBrowser(ampCookie({ deviceId: 'cookie-device', sessionId: 555 }));
    getDeviceIdMock.mockReturnValue('sdk-device');
    getSessionIdMock.mockReturnValue(undefined);

    expect(getAnalyticsIdentityHeaders()).toEqual({
      [DEVICE_ID_HEADER]: 'sdk-device',
      [SESSION_ID_HEADER]: '555',
    });
  });

  it('SDK·쿠키 모두 값이 없으면 빈 객체를 반환한다', () => {
    stubBrowser('');
    getDeviceIdMock.mockReturnValue(undefined);
    getSessionIdMock.mockReturnValue(undefined);

    expect(getAnalyticsIdentityHeaders()).toEqual({});
  });

  it('마케팅용 AMP_MKTG_ 쿠키는 식별자 쿠키로 쓰지 않는다', () => {
    stubBrowser(
      `AMP_MKTG_test=${btoa(encodeURIComponent(JSON.stringify({})))}`,
    );
    getDeviceIdMock.mockReturnValue(undefined);
    getSessionIdMock.mockReturnValue(undefined);

    expect(getAnalyticsIdentityHeaders()).toEqual({});
  });

  it('쿠키 파싱에 실패하면 헤더를 생략한다', () => {
    stubBrowser('AMP_test=not-a-valid-base64-json');
    getDeviceIdMock.mockReturnValue(undefined);
    getSessionIdMock.mockReturnValue(undefined);

    expect(getAnalyticsIdentityHeaders()).toEqual({});
  });

  describe('dev 전용 device_id 폴백', () => {
    const createStorage = (initial: Record<string, string> = {}) => {
      const store = new Map(Object.entries(initial));

      return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        store,
      };
    };

    const stubDevBrowser = (storage: ReturnType<typeof createStorage>) => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubGlobal('window', { localStorage: storage });
      vi.stubGlobal('document', { cookie: '' });
    };

    it('development에서 SDK·쿠키 모두 없으면 device_id를 생성해 localStorage에 저장한다', () => {
      const storage = createStorage();

      stubDevBrowser(storage);
      getDeviceIdMock.mockReturnValue(undefined);
      getSessionIdMock.mockReturnValue(undefined);

      const headers = getAnalyticsIdentityHeaders();

      const deviceId = headers[DEVICE_ID_HEADER];

      expect(deviceId).toBeTruthy();
      expect(storage.store.get('manyak-dev-device-id')).toBe(deviceId);
    });

    it('development에서 저장된 dev device_id가 있으면 재사용한다', () => {
      const storage = createStorage({ 'manyak-dev-device-id': 'dev-device' });

      stubDevBrowser(storage);
      getDeviceIdMock.mockReturnValue(undefined);
      getSessionIdMock.mockReturnValue(undefined);

      expect(getAnalyticsIdentityHeaders()).toEqual({
        [DEVICE_ID_HEADER]: 'dev-device',
      });
    });

    it('development에서도 SDK 값이 있으면 dev 폴백을 쓰지 않는다', () => {
      const storage = createStorage({ 'manyak-dev-device-id': 'dev-device' });

      stubDevBrowser(storage);
      getDeviceIdMock.mockReturnValue('sdk-device');
      getSessionIdMock.mockReturnValue(undefined);

      expect(getAnalyticsIdentityHeaders()).toEqual({
        [DEVICE_ID_HEADER]: 'sdk-device',
      });
    });

    it('development가 아니면 dev 폴백을 적용하지 않는다', () => {
      const storage = createStorage({ 'manyak-dev-device-id': 'dev-device' });

      vi.stubEnv('NODE_ENV', 'production');
      vi.stubGlobal('window', { localStorage: storage });
      vi.stubGlobal('document', { cookie: '' });
      getDeviceIdMock.mockReturnValue(undefined);
      getSessionIdMock.mockReturnValue(undefined);

      expect(getAnalyticsIdentityHeaders()).toEqual({});
    });

    it('localStorage 접근이 실패하면 dev 폴백을 생략한다', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubGlobal('window', {
        localStorage: {
          getItem: () => {
            throw new Error('blocked');
          },
          setItem: () => {
            throw new Error('blocked');
          },
        },
      });
      vi.stubGlobal('document', { cookie: '' });
      getDeviceIdMock.mockReturnValue(undefined);
      getSessionIdMock.mockReturnValue(undefined);

      expect(getAnalyticsIdentityHeaders()).toEqual({});
    });
  });

  it('session_id가 0이어도 헤더로 싣는다', () => {
    stubBrowser('');
    getDeviceIdMock.mockReturnValue(undefined);
    getSessionIdMock.mockReturnValue(0);

    expect(getAnalyticsIdentityHeaders()).toEqual({
      [SESSION_ID_HEADER]: '0',
    });
  });
});
