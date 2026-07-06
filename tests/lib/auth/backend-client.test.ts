import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BackendAuthError,
  loginWithGoogleOnServer,
  logoutOnServer,
} from '@/lib/auth/backend-client';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('API_BASE_URL', 'https://backend.example.com/api');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('loginWithGoogleOnServer', () => {
  it('idToken을 /v1/auth/login/google로 POST하고 토큰 응답을 반환한다', async () => {
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

  it('실패 응답은 status를 담은 BackendAuthError를 던진다', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(loginWithGoogleOnServer('bad')).rejects.toMatchObject({
      status: 401,
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
