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
} from './identity';

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

  it('session_id가 0이어도 헤더로 싣는다', () => {
    stubBrowser('');
    getDeviceIdMock.mockReturnValue(undefined);
    getSessionIdMock.mockReturnValue(0);

    expect(getAnalyticsIdentityHeaders()).toEqual({
      [SESSION_ID_HEADER]: '0',
    });
  });
});
