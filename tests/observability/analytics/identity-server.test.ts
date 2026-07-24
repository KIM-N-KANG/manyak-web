import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock 팩토리가 참조하는 값은 호이스팅 TDZ를 피하려 vi.hoisted로 선언한다.
const cookieStoreMock = vi.hoisted(() => ({
  getAll: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => cookieStoreMock,
}));

import { readAmplitudeDeviceIdOnServer } from '@/observability/analytics/identity-server';

// Amplitude가 저장하는 쿠키와 같은 형식(base64 → URL 인코드 → JSON)으로 만든다.
const ampCookieValue = (state: { deviceId?: string; sessionId?: number }) =>
  btoa(encodeURIComponent(JSON.stringify(state)));

beforeEach(() => {
  cookieStoreMock.getAll.mockReset();
});

describe('readAmplitudeDeviceIdOnServer', () => {
  it('요청 쿠키의 AMP_ 쿠키에서 device_id를 읽는다', async () => {
    cookieStoreMock.getAll.mockReturnValue([
      { name: 'other', value: 'x' },
      { name: 'AMP_abc123', value: ampCookieValue({ deviceId: 'device-1' }) },
    ]);

    await expect(readAmplitudeDeviceIdOnServer()).resolves.toBe('device-1');
  });

  it('마케팅용 AMP_MKTG_ 쿠키는 식별자 쿠키로 쓰지 않는다', async () => {
    cookieStoreMock.getAll.mockReturnValue([
      {
        name: 'AMP_MKTG_abc123',
        value: ampCookieValue({ deviceId: 'mktg-device' }),
      },
    ]);

    await expect(readAmplitudeDeviceIdOnServer()).resolves.toBeUndefined();
  });

  it('AMP_ 쿠키가 없으면 undefined를 반환한다', async () => {
    cookieStoreMock.getAll.mockReturnValue([{ name: 'other', value: 'x' }]);

    await expect(readAmplitudeDeviceIdOnServer()).resolves.toBeUndefined();
  });

  it('쿠키 파싱에 실패하면 undefined를 반환한다', async () => {
    cookieStoreMock.getAll.mockReturnValue([
      { name: 'AMP_abc123', value: 'not-a-valid-base64-json' },
    ]);

    await expect(readAmplitudeDeviceIdOnServer()).resolves.toBeUndefined();
  });
});
