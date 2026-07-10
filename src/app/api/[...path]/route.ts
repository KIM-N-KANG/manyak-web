import { ensureFreshAccessToken } from '@/lib/auth/backend-session';
import { SESSION_EXPIRED_HEADER } from '@/lib/auth/session-expiry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ApiProxyContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const PROXY_BASE_PATH = '/api';
const BODYLESS_METHODS = new Set(['GET', 'HEAD']);

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const stripProxyBasePath = (pathname: string) => {
  if (pathname === PROXY_BASE_PATH) {
    return '';
  }

  if (pathname.startsWith(`${PROXY_BASE_PATH}/`)) {
    return pathname.slice(PROXY_BASE_PATH.length);
  }

  return pathname;
};

const joinPaths = (basePath: string, pathname: string) => {
  const normalizedBasePath = trimTrailingSlash(basePath);

  if (!normalizedBasePath || normalizedBasePath === '/') {
    return pathname;
  }

  if (
    pathname === normalizedBasePath ||
    pathname.startsWith(`${normalizedBasePath}/`)
  ) {
    return pathname;
  }

  return `${normalizedBasePath}${stripProxyBasePath(pathname)}`;
};

const buildTargetUrl = (requestUrl: string, apiBaseUrl: string) => {
  const sourceUrl = new URL(requestUrl);
  const targetBaseUrl = new URL(apiBaseUrl);
  const targetUrl = new URL(targetBaseUrl.href);

  targetUrl.pathname = joinPaths(targetBaseUrl.pathname, sourceUrl.pathname);
  targetUrl.search = sourceUrl.search;

  return targetUrl.href;
};

const createProxyRequestInit = async (request: Request) => {
  const headers = new Headers(request.headers);
  const method = request.method.toUpperCase();

  headers.delete('host');
  // BFF 세션 쿠키(백엔드 토큰·NextAuth 세션)를 백엔드로 흘리지 않는다 —
  // 인증은 Authorization 헤더 주입으로만 전달한다.
  headers.delete('cookie');

  const init: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };

  if (!BODYLESS_METHODS.has(method) && request.body) {
    init.body = await request.arrayBuffer();
  }

  return init;
};

const proxyRequest = async (request: Request, _context: ApiProxyContext) => {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    return Response.json('API_BASE_URL is not configured.', { status: 500 });
  }

  let targetUrl: string;

  try {
    targetUrl = buildTargetUrl(request.url, apiBaseUrl);
  } catch {
    return Response.json('API_BASE_URL is invalid.', { status: 500 });
  }

  // 회원 세션이면 BFF가 access 토큰을 주입한다(브라우저 JS는 Authorization을 붙이지 않음 — 스펙 §3-8).
  const auth = await ensureFreshAccessToken();

  // 리프레시가 확정 거절돼 세션이 폐기된 경우: 백엔드로 전달하지 않고 즉시 차단한다.
  // 익명으로 전달하면 회원의 요청(특히 변경)이 게스트 콘텐츠로 잘못 귀속된다.
  // 만료 헤더로 클라이언트의 능동 로그아웃을 신호한다. 쿠키 삭제(Set-Cookie)는
  // ensureFreshAccessToken 내부의 clearBackendSession이 처리했다.
  if (auth.status === 'expired') {
    return Response.json('세션이 만료되었습니다.', {
      status: 401,
      headers: { [SESSION_EXPIRED_HEADER]: '1' },
    });
  }

  // 회원인데 일시 장애로 토큰을 확보하지 못한 경우: 익명 전달(잘못된 귀속) 대신
  // 일시 오류로 응답해 클라이언트 재시도에 맡긴다. 세션은 보존돼 있다.
  if (auth.status === 'degraded') {
    return Response.json(
      '일시적인 인증 오류입니다. 잠시 후 다시 시도해 주세요.',
      {
        status: 503,
      },
    );
  }

  const init = await createProxyRequestInit(request);

  if (auth.status === 'authenticated') {
    (init.headers as Headers).set(
      'authorization',
      `Bearer ${auth.accessToken}`,
    );
  }

  const response = await fetch(targetUrl, init);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
};

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
