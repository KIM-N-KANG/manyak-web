const API_TIMEOUT_MS = 120 * 1000;
const API_PROXY_BASE_PATH = '/api';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig extends Omit<RequestInit, 'method' | 'body'> {
  timeout?: number;
}

export class FetchError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.data = data;
  }
}

export const resolveApiProxyUrl = (url: string) => {
  const resolvedUrl = /^https?:\/\//.test(url)
    ? new URL(url).pathname + new URL(url).search
    : url;
  const normalizedUrl = resolvedUrl.startsWith('/')
    ? resolvedUrl
    : `/${resolvedUrl}`;

  if (
    normalizedUrl === API_PROXY_BASE_PATH ||
    normalizedUrl.startsWith(`${API_PROXY_BASE_PATH}/`) ||
    normalizedUrl.startsWith(`${API_PROXY_BASE_PATH}?`)
  ) {
    return normalizedUrl;
  }

  return `${API_PROXY_BASE_PATH}${normalizedUrl}`;
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeout: number,
): Promise<Response> => {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const abortRequest = () => controller.abort(externalSignal?.reason);
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (externalSignal?.aborted) {
    abortRequest();
  } else {
    externalSignal?.addEventListener('abort', abortRequest, {
      once: true,
    });
  }

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', abortRequest);
  }
};

const request = async <T>(
  method: RequestMethod,
  url: string,
  data?: unknown,
  config: RequestConfig = {},
): Promise<T> => {
  const { timeout = API_TIMEOUT_MS, ...restConfig } = config;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...restConfig.headers,
  };

  const options: RequestInit = {
    ...restConfig,
    method,
    headers,
  };

  if (data !== undefined && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetchWithTimeout(
    resolveApiProxyUrl(url),
    options,
    timeout,
  );

  if (!response.ok) {
    let errorData: unknown = null;

    try {
      errorData = await response.json();
    } catch {
      // JSON 형태의 에러 응답이 아니면 null로 처리합니다.
    }

    throw new FetchError(
      '요청 처리에 실패했습니다.',
      response.status,
      errorData,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('Content-Type') ?? '';

  if (contentType.includes('text/event-stream')) {
    if (response.body) {
      return response.body as T;
    }

    return (await response.text()) as T;
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
};

export const customFetch = {
  get: <T>(url: string, config?: RequestConfig) =>
    request<T>('GET', url, undefined, config),

  post: <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>('POST', url, data, config),

  put: <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>('PUT', url, data, config),

  patch: <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>('PATCH', url, data, config),

  delete: <T>(url: string, config?: RequestConfig) =>
    request<T>('DELETE', url, undefined, config),
};
