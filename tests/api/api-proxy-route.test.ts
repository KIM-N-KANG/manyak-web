import { beforeEach, describe, expect, it, vi } from 'vitest';

// route.ts는 `ensureFreshAccessToken`을 통해 backend-session → token-cookies →
// next/headers까지 전이 import한다. next/headers의 cookies()는 실제 Next.js 요청
// 스코프 밖에서 호출되면 예외를 던지므로, 이 모듈을 통째로 목킹해 프록시 핸들러를
// 요청 컨텍스트 없이 단위 테스트할 수 있게 한다.
const backendSessionMock = vi.hoisted(() => ({
  ensureFreshAccessToken: vi.fn(),
}));

vi.mock('@/lib/auth/backend-session', () => backendSessionMock);

import * as route from '@/app/api/[...path]/route';

const routeContext = (path: string[]) => ({
  params: Promise.resolve({ path }),
});

beforeEach(() => {
  vi.clearAllMocks();
  // 기본값: 게스트(세션 없음). 토큰 주입이 필요한 테스트에서만 개별 override.
  backendSessionMock.ensureFreshAccessToken.mockResolvedValue({
    status: 'guest',
  });
});

describe('api proxy route', () => {
  it('exposes dynamic node handlers', () => {
    expect(route.runtime).toBe('nodejs');
    expect(route.dynamic).toBe('force-dynamic');
    expect(typeof route.GET).toBe('function');
    expect(typeof route.POST).toBe('function');
    expect(typeof route.PUT).toBe('function');
    expect(typeof route.PATCH).toBe('function');
    expect(typeof route.DELETE).toBe('function');
  });

  it('forwards GET requests without body and preserves query strings', async () => {
    const originalFetch = globalThis.fetch;
    const previousApiBaseUrl = process.env.API_BASE_URL;
    let capturedRequest!: { url: unknown; init: RequestInit };

    process.env.API_BASE_URL = 'http://backend.test';
    globalThis.fetch = async (url, init) => {
      capturedRequest = { url, init: init ?? {} };

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const response = await route.GET(
        new Request('http://localhost:3000/api/v1/stories?cursor=10', {
          headers: {
            host: 'localhost:3000',
            'x-request-id': 'test-request',
            cookie: 'manyak_session_access=abc',
          },
        }),
        routeContext(['v1', 'stories']),
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('{"ok":true}');
    } finally {
      globalThis.fetch = originalFetch;
      process.env.API_BASE_URL = previousApiBaseUrl;
    }

    expect(capturedRequest.url).toBe(
      'http://backend.test/api/v1/stories?cursor=10',
    );
    expect(capturedRequest.init.method).toBe('GET');
    expect(capturedRequest.init.body).toBeUndefined();
    expect(capturedRequest.init.cache).toBe('no-store');
    expect(new Headers(capturedRequest.init.headers).has('host')).toBe(false);
    expect(new Headers(capturedRequest.init.headers).get('x-request-id')).toBe(
      'test-request',
    );
    // 게스트는 Authorization을 주입하지 않는다(익명 패스스루).
    expect(new Headers(capturedRequest.init.headers).has('authorization')).toBe(
      false,
    );
    // BFF 세션 쿠키를 백엔드로 흘리지 않는다.
    expect(new Headers(capturedRequest.init.headers).has('cookie')).toBe(false);
  });

  it('forwards mutation bodies and maps proxy paths onto API_BASE_URL prefixes', async () => {
    const originalFetch = globalThis.fetch;
    const previousApiBaseUrl = process.env.API_BASE_URL;
    let capturedRequest!: { url: unknown; init: RequestInit };

    process.env.API_BASE_URL = 'http://backend.test/api/v1';
    globalThis.fetch = async (url, init) => {
      capturedRequest = { url, init: init ?? {} };

      return new Response('created', {
        status: 201,
        headers: { 'Content-Type': 'text/plain' },
      });
    };

    try {
      const response = await route.POST(
        new Request('http://localhost:3000/api/stories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            host: 'localhost:3000',
            cookie: 'manyak_session_access=abc',
          },
          body: JSON.stringify({ title: '테스트' }),
        }),
        routeContext(['stories']),
      );

      expect(response.status).toBe(201);
      expect(await response.text()).toBe('created');
    } finally {
      globalThis.fetch = originalFetch;
      process.env.API_BASE_URL = previousApiBaseUrl;
    }

    expect(capturedRequest.url).toBe('http://backend.test/api/v1/stories');
    expect(capturedRequest.init.method).toBe('POST');
    expect(capturedRequest.init.cache).toBe('no-store');
    expect(new Headers(capturedRequest.init.headers).has('host')).toBe(false);
    expect(
      new TextDecoder().decode(capturedRequest.init.body as BufferSource),
    ).toBe('{"title":"테스트"}');
    // 게스트는 Authorization을 주입하지 않는다(익명 패스스루).
    expect(new Headers(capturedRequest.init.headers).has('authorization')).toBe(
      false,
    );
    // BFF 세션 쿠키를 백엔드로 흘리지 않는다.
    expect(new Headers(capturedRequest.init.headers).has('cookie')).toBe(false);
  });

  it('injects Authorization: Bearer for authenticated sessions', async () => {
    const originalFetch = globalThis.fetch;
    const previousApiBaseUrl = process.env.API_BASE_URL;
    let capturedRequest!: { url: unknown; init: RequestInit };

    backendSessionMock.ensureFreshAccessToken.mockResolvedValue({
      status: 'authenticated',
      accessToken: 'fresh-access-token',
    });
    process.env.API_BASE_URL = 'http://backend.test';
    globalThis.fetch = async (url, init) => {
      capturedRequest = { url, init: init ?? {} };

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const response = await route.GET(
        new Request('http://localhost:3000/api/v1/stories', {
          headers: { host: 'localhost:3000' },
        }),
        routeContext(['v1', 'stories']),
      );

      expect(response.status).toBe(200);
    } finally {
      globalThis.fetch = originalFetch;
      process.env.API_BASE_URL = previousApiBaseUrl;
    }

    expect(backendSessionMock.ensureFreshAccessToken).toHaveBeenCalledTimes(1);
    expect(new Headers(capturedRequest.init.headers).get('authorization')).toBe(
      'Bearer fresh-access-token',
    );
  });

  it('세션이 만료되면 백엔드로 전달하지 않고 401과 만료 헤더로 즉시 응답한다', async () => {
    const originalFetch = globalThis.fetch;
    const previousApiBaseUrl = process.env.API_BASE_URL;
    let fetchCalled = false;

    backendSessionMock.ensureFreshAccessToken.mockResolvedValue({
      status: 'expired',
    });
    process.env.API_BASE_URL = 'http://backend.test';
    globalThis.fetch = async () => {
      fetchCalled = true;

      return new Response(null);
    };

    try {
      const response = await route.POST(
        new Request('http://localhost:3000/api/v1/stories', {
          method: 'POST',
          headers: { host: 'localhost:3000' },
          body: JSON.stringify({ title: '테스트' }),
        }),
        routeContext(['v1', 'stories']),
      );

      expect(response.status).toBe(401);
      expect(response.headers.get('x-manyak-session-expired')).toBe('1');
    } finally {
      globalThis.fetch = originalFetch;
      process.env.API_BASE_URL = previousApiBaseUrl;
    }

    // 만료된 회원의 요청이 익명으로 실행되면(특히 변경 요청) 게스트 콘텐츠로
    // 잘못 귀속되므로, 백엔드로 아예 전달하지 않는다.
    expect(fetchCalled).toBe(false);
  });

  it('일시 장애로 인증을 확보하지 못한 회원(degraded)의 요청은 전달하지 않고 503으로 응답한다', async () => {
    const originalFetch = globalThis.fetch;
    const previousApiBaseUrl = process.env.API_BASE_URL;
    let fetchCalled = false;

    backendSessionMock.ensureFreshAccessToken.mockResolvedValue({
      status: 'degraded',
    });
    process.env.API_BASE_URL = 'http://backend.test';
    globalThis.fetch = async () => {
      fetchCalled = true;

      return new Response(null);
    };

    try {
      const response = await route.GET(
        new Request('http://localhost:3000/api/v1/stories', {
          headers: { host: 'localhost:3000' },
        }),
        routeContext(['v1', 'stories']),
      );

      expect(response.status).toBe(503);
      // 세션은 보존된 일시 실패이므로 능동 로그아웃 신호를 보내지 않는다.
      expect(response.headers.get('x-manyak-session-expired')).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
      process.env.API_BASE_URL = previousApiBaseUrl;
    }

    expect(fetchCalled).toBe(false);
  });

  it('returns 500 when API_BASE_URL is missing', async () => {
    const originalFetch = globalThis.fetch;
    const previousApiBaseUrl = process.env.API_BASE_URL;
    let fetchCalled = false;

    delete process.env.API_BASE_URL;
    globalThis.fetch = async () => {
      fetchCalled = true;

      return new Response(null);
    };

    try {
      const response = await route.GET(
        new Request('http://localhost:3000/api/stories'),
        routeContext(['stories']),
      );

      expect(response.status).toBe(500);
      expect(await response.json()).toBe('API_BASE_URL is not configured.');
    } finally {
      globalThis.fetch = originalFetch;
      process.env.API_BASE_URL = previousApiBaseUrl;
    }

    expect(fetchCalled).toBe(false);
  });
});
