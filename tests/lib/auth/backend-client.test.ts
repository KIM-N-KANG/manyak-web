import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BackendAuthError,
  loginWithGoogleOnServer,
  logoutOnServer,
} from '@/lib/auth/backend-client';

const fetchMock = vi.fn();

beforeEach(() => {
  // 실제 환경(.env)의 API_BASE_URL은 /api를 포함하지 않는다. /api 접두사는
  // 경로 쪽에 있어야 하며(생성된 Orval 클라이언트와 동일), 여기서도 그 전제로 검증한다.
  vi.stubEnv('API_BASE_URL', 'https://backend.example.com');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('loginWithGoogleOnServer', () => {
  it('백엔드 요청의 기본 타임아웃은 180초다', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, options: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = options.signal;

          signal?.addEventListener('abort', () => {
            reject(signal.reason);
          });
        }),
    );

    try {
      const promise = loginWithGoogleOnServer('id-token');
      const assertion = expect(promise).rejects.toMatchObject({
        name: 'TimeoutError',
      });

      await vi.advanceTimersByTimeAsync(180 * 1000 - 1);

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

      expect(init.signal).toBeDefined();
      expect(init.signal?.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('idToken을 /api/v1/auth/login/google로 POST하고 토큰 응답을 반환한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'a' }), { status: 200 }),
    );

    await expect(loginWithGoogleOnServer('id-token')).resolves.toEqual({
      accessToken: 'a',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('https://backend.example.com/api/v1/auth/login/google');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ idToken: 'id-token' });
  });

  it('inviteCode를 함께 주면 요청 body에 포함한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'a' }), { status: 200 }),
    );

    await loginWithGoogleOnServer('id-token', 'CW6VZX7D');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(JSON.parse(init.body as string)).toEqual({
      idToken: 'id-token',
      inviteCode: 'CW6VZX7D',
    });
  });

  it('inviteCode가 null이면 body에 싣지 않는다', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'a' }), { status: 200 }),
    );

    await loginWithGoogleOnServer('id-token', null);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(JSON.parse(init.body as string)).toEqual({ idToken: 'id-token' });
  });

  it('실패 응답은 status와 응답 body를 담은 BackendAuthError를 던진다', async () => {
    fetchMock.mockResolvedValue(
      new Response('유효하지 않은 Google ID 토큰입니다.', { status: 401 }),
    );

    await expect(loginWithGoogleOnServer('bad')).rejects.toMatchObject({
      status: 401,
      body: '유효하지 않은 Google ID 토큰입니다.',
    });
    await expect(loginWithGoogleOnServer('bad')).rejects.toBeInstanceOf(
      BackendAuthError,
    );
  });
});

describe('logoutOnServer', () => {
  it('204 응답을 정상 처리한다', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(logoutOnServer('refresh')).resolves.toBeUndefined();
  });
});
