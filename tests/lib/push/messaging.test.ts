import { getToken, isSupported } from 'firebase/messaging';
import { afterEach, expect, it, vi } from 'vitest';

import { requestPushToken } from '@/lib/push/messaging';

vi.mock('firebase/app', () => ({
  getApps: () => [],
  initializeApp: () => ({}),
}));

vi.mock('firebase/messaging', () => ({
  isSupported: vi.fn().mockResolvedValue(true),
  getMessaging: () => ({}),
  getToken: vi.fn().mockResolvedValue('push-token'),
}));

vi.mock('@/lib/push/config', () => ({
  IS_PUSH_ENABLED: true,
  PUSH_FIREBASE_CONFIG: {},
  PUSH_SERVICE_WORKER_PATH: '/firebase-messaging-sw.js',
  PUSH_VAPID_KEY: 'test-vapid-key',
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it('오프라인에서는 발급하지 않고 연결 복구 후 다시 요청하면 발급한다', async () => {
  const register = vi.fn().mockResolvedValue({});
  const browserNavigator = { onLine: false, serviceWorker: { register } };

  vi.stubGlobal('window', {});
  vi.stubGlobal('navigator', browserNavigator);

  await expect(requestPushToken()).resolves.toBeNull();
  expect(isSupported).not.toHaveBeenCalled();
  expect(register).not.toHaveBeenCalled();
  expect(getToken).not.toHaveBeenCalled();

  browserNavigator.onLine = true;

  await expect(requestPushToken()).resolves.toBe('push-token');
  expect(register).toHaveBeenCalledOnce();
  expect(getToken).toHaveBeenCalledOnce();
});

it('서비스 워커 등록 도중 오프라인이 되면 Firebase 토큰 발급을 건너뛴다', async () => {
  vi.stubGlobal('window', {});
  vi.stubGlobal('navigator', {
    onLine: true,
    serviceWorker: {
      register: vi.fn().mockImplementation(async () => {
        vi.stubGlobal('navigator', { onLine: false });

        return {};
      }),
    },
  });

  await expect(requestPushToken()).resolves.toBeNull();
  expect(getToken).not.toHaveBeenCalled();
});
