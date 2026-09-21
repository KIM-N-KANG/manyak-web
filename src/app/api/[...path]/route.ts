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

/**
 * 문자열 끝의 슬래시를 모두 제거한다.
 *
 * @param value 다듬을 경로 문자열
 * @returns 끝 슬래시가 제거된 문자열
 */
const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

/**
 * 프록시 기준 경로(`/api`) 접두사를 경로에서 제거한다.
 *
 * @param pathname 요청 경로
 * @returns 프록시 접두사가 제거된 경로
 */
const stripProxyBasePath = (pathname: string) => {
  if (pathname === PROXY_BASE_PATH) {
    return '';
  }

  if (pathname.startsWith(`${PROXY_BASE_PATH}/`)) {
    return pathname.slice(PROXY_BASE_PATH.length);
  }

  return pathname;
};

/**
 * 백엔드 기준 경로와 요청 경로를 결합해 최종 대상 경로를 만든다.
 *
 * @param basePath 백엔드 기준 경로
 * @param pathname 요청 경로
 * @returns 결합된 대상 경로
 */
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

/**
 * 요청 URL과 백엔드 기준 URL로 프록시 대상 URL을 만든다.
 *
 * @param requestUrl 원본 요청 URL
 * @param apiBaseUrl 백엔드 기준 URL
 * @returns 프록시 대상 URL 문자열
 */
const buildTargetUrl = (requestUrl: string, apiBaseUrl: string) => {
  const sourceUrl = new URL(requestUrl);
  const targetBaseUrl = new URL(apiBaseUrl);
  const targetUrl = new URL(targetBaseUrl.href);

  targetUrl.pathname = joinPaths(targetBaseUrl.pathname, sourceUrl.pathname);
  targetUrl.search = sourceUrl.search;

  return targetUrl.href;
};

/**
 * 프록시 전달용 요청 초기화 객체를 생성한다(호스트·쿠키 헤더 제거, 본문 복사).
 *
 * @param request 원본 요청
 * @returns fetch에 전달할 RequestInit 객체
 */
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

/**
 * 세션 만료(리프레시 확정 거절) 응답을 만든다. 만료 헤더로 클라이언트의 능동 로그아웃을
 * 신호한다. 쿠키 삭제(Set-Cookie)는 ensureFreshAccessToken 내부의 clearBackendSession이
 * 처리했다.
 *
 * @returns 만료 헤더가 붙은 401 응답
 */
const createSessionExpiredResponse = () =>
  Response.json('세션이 만료되었습니다.', {
    status: 401,
    headers: { [SESSION_EXPIRED_HEADER]: '1' },
  });

/**
 * 요청을 백엔드로 프록시하며 회원 세션 토큰 주입과 만료·장애 처리를 수행한다.
 *
 * @param request 원본 요청
 * @param _context 라우트 컨텍스트(경로 파라미터)
 * @returns 백엔드 응답 또는 오류 응답
 */
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
  if (auth.status === 'expired') {
    return createSessionExpiredResponse();
  }

  // 회원인데 일시 장애로 토큰을 확보하지 못한 경우: 익명 전달(잘못된 귀속) 대신
  // 일시 오류로 응답해 클라이언트 재시도에 맡긴다. 세션은 보존돼 있다.
  if (auth.status === 'degraded') {
    return Response.json(
      '일시적인 인증 오류입니다. 잠시 후 다시 시도해주세요.',
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

  let response = await fetch(targetUrl, init);

  // 만료 전 access 토큰을 백엔드가 401로 거절한 경우(다른 기기 탈퇴·로그아웃으로
  // family 폐기, 서버 키 회전 등)는 시간 기반 선제 재발급이 잡지 못한다. 그대로
  // 통과시키면 access TTL이 끝날 때까지 회원 요청이 조용히 실패하므로, 재발급을
  // 한 번 시도해 새 토큰이면 재시도하고 확정 거절이면 능동 로그아웃을 신호한다.
  // 본문은 이미 버퍼링돼 있어 재전송할 수 있고, 백엔드가 인증 단계에서 거절한
  // 요청은 처리된 적이 없어 변경 요청도 중복 실행되지 않는다.
  if (response.status === 401 && auth.status === 'authenticated') {
    const retried = await ensureFreshAccessToken(Date.now(), {
      forceRefresh: true,
    });

    if (retried.status === 'expired') {
      await response.body?.cancel();

      return createSessionExpiredResponse();
    }

    // 재발급 일시 실패는 기존 토큰을 그대로 돌려주므로, 실제로 새 토큰을 받았을
    // 때만 재시도한다. 같은 토큰으로 재시도해도 결과가 같아 무의미하다.
    if (
      retried.status === 'authenticated' &&
      retried.accessToken !== auth.accessToken
    ) {
      await response.body?.cancel();
      (init.headers as Headers).set(
        'authorization',
        `Bearer ${retried.accessToken}`,
      );
      response = await fetch(targetUrl, init);
    }
  }

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
