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

  const response = await fetch(
    targetUrl,
    await createProxyRequestInit(request),
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
