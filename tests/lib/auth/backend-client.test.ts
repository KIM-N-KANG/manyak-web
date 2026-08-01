import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BackendAuthError,
  confirmHandoffOnServer,
  loginWithSocialOnServer,
  logoutOnServer,
} from '@/lib/auth/backend-client';
import { HANDOFF_CODE_HEADER } from '@/lib/auth/handoff-header';
import { API_TIMEOUT_MS } from '@/lib/fetch-with-timeout';
import { DEVICE_ID_HEADER } from '@/observability/analytics/amplitude-identity';

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

describe('loginWithSocialOnServer', () => {
  it('백엔드 요청에 기본 타임아웃을 적용한다', async () => {
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
      const promise = loginWithSocialOnServer('google', 'id-token');
      const assertion = expect(promise).rejects.toMatchObject({
        name: 'TimeoutError',
      });

      await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS - 1);

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

    await expect(
      loginWithSocialOnServer('google', 'id-token'),
    ).resolves.toEqual({
      accessToken: 'a',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('https://backend.example.com/api/v1/auth/login/google');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ idToken: 'id-token' });
  });

  it('kakao provider는 /api/v1/auth/login/kakao로 POST한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'a' }), { status: 200 }),
    );

    await expect(loginWithSocialOnServer('kakao', 'id-token')).resolves.toEqual(
      { accessToken: 'a' },
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('https://backend.example.com/api/v1/auth/login/kakao');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ idToken: 'id-token' });
  });

  it('deviceId를 주면 X-Manyak-Device-Id 헤더에 원문 그대로 담아 전송한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'a' }), { status: 200 }),
    );

    // 서버가 pepper를 붙여 내부에서 해시하므로 클라이언트 측 가공(해시) 없이 원문이어야 한다.
    await loginWithSocialOnServer('google', 'id-token', 'raw-device-id-1234');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(headers.get(DEVICE_ID_HEADER)).toBe('raw-device-id-1234');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('deviceId가 없으면 X-Manyak-Device-Id 헤더를 보내지 않는다', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'a' }), { status: 200 }),
    );

    await loginWithSocialOnServer('google', 'id-token');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(headers.get(DEVICE_ID_HEADER)).toBeNull();
  });

  it('handoffCode를 주면 요청 body에 함께 담아 전송한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'a' }), { status: 200 }),
    );

    await loginWithSocialOnServer(
      'google',
      'id-token',
      'raw-device-id',
      'handoff-code',
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(JSON.parse(init.body as string)).toEqual({
      idToken: 'id-token',
      handoffCode: 'handoff-code',
    });
  });

  it('handoffCode가 없으면 body에 handoffCode 필드를 생략한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'a' }), { status: 200 }),
    );

    await loginWithSocialOnServer('google', 'id-token', 'raw-device-id');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(JSON.parse(init.body as string)).toEqual({ idToken: 'id-token' });
  });

  it('실패 응답은 status와 응답 body를 담은 BackendAuthError를 던진다', async () => {
    fetchMock.mockResolvedValue(
      new Response('유효하지 않은 Google ID 토큰입니다.', { status: 401 }),
    );

    await expect(
      loginWithSocialOnServer('google', 'bad'),
    ).rejects.toMatchObject({
      status: 401,
      body: '유효하지 않은 Google ID 토큰입니다.',
    });
    await expect(
      loginWithSocialOnServer('google', 'bad'),
    ).rejects.toBeInstanceOf(BackendAuthError);
  });
});

describe('logoutOnServer', () => {
  it('204 응답을 정상 처리한다', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(logoutOnServer('refresh')).resolves.toBeUndefined();
  });
});

describe('confirmHandoffOnServer', () => {
  it('핸드오프 코드를 X-Manyak-Handoff-Code 헤더로 실어 확인 API를 GET한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ storyCount: 2, chatCount: 1, callbackPath: '/' }),
        { status: 200 },
      ),
    );

    // 코드는 URI가 아니라 헤더로 전달하는 게 계약이다(스펙 §4-3-5).
    await expect(confirmHandoffOnServer('code-abc')).resolves.toEqual({
      storyCount: 2,
      chatCount: 1,
      callbackPath: '/',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(url).toBe('https://backend.example.com/api/v1/auth/handoffs');
    expect(init.method ?? 'GET').toBe('GET');
    expect(headers.get(HANDOFF_CODE_HEADER)).toBe('code-abc');
  });

  it('만료·무효(404)면 BackendAuthError를 던진다', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 404 }));

    await expect(confirmHandoffOnServer('gone')).rejects.toMatchObject({
      status: 404,
    });
  });
});
