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

  it('브라우저에서 device_id·session_id를 헤더로 싣는다', () => {
    vi.stubGlobal('window', {});
    getDeviceIdMock.mockReturnValue('device-1');
    getSessionIdMock.mockReturnValue(1717777777);

    expect(getAnalyticsIdentityHeaders()).toEqual({
      [DEVICE_ID_HEADER]: 'device-1',
      [SESSION_ID_HEADER]: '1717777777',
    });
  });

  it('SDK 미초기화로 값이 없으면 해당 헤더를 생략한다', () => {
    vi.stubGlobal('window', {});
    getDeviceIdMock.mockReturnValue(undefined);
    getSessionIdMock.mockReturnValue(undefined);

    expect(getAnalyticsIdentityHeaders()).toEqual({});
  });

  it('session_id가 0이어도 헤더로 싣는다', () => {
    vi.stubGlobal('window', {});
    getDeviceIdMock.mockReturnValue(undefined);
    getSessionIdMock.mockReturnValue(0);

    expect(getAnalyticsIdentityHeaders()).toEqual({
      [SESSION_ID_HEADER]: '0',
    });
  });
});
