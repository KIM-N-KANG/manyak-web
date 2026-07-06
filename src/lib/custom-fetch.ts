import { getAnalyticsIdentityHeaders } from '@/observability/analytics/identity';
import { captureApiError } from '@/observability/monitoring/sentry';

import { FetchError } from './api-error';

export { FetchError };

const API_TIMEOUT_MS = 120 * 1000;
const API_PROXY_BASE_PATH = '/api';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** customFetch 요청에 사용하는 설정. RequestInit에 타임아웃 옵션을 더한 형태다. */
export interface RequestConfig extends Omit<RequestInit, 'method' | 'body'> {
  /** 요청 타임아웃(ms). 기본값은 120초 */
  timeout?: number;
}

/**
 * 요청 URL을 Next.js API 프록시(/api) 경로로 변환한다.
 * 절대 URL은 pathname만 남기고, 이미 /api로 시작하면 그대로 반환한다.
 */
export function resolveApiProxyUrl(url: string) {
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
}

const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeout: number,
): Promise<Response> => {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const abortRequest = () => controller.abort(externalSignal?.reason);
  // 타임아웃은 사용자 취소(AbortError)와 구분되도록 TimeoutError로 중단해
  // Sentry가 실제 백엔드 지연·장애로 인식하게 한다(스펙 §AN-2-8).
  const timeoutId = setTimeout(
    () =>
      controller.abort(
        new DOMException('요청 시간이 초과되었습니다.', 'TimeoutError'),
      ),
    timeout,
  );

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
    ...getAnalyticsIdentityHeaders(),
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

  try {
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
  } catch (error) {
    captureApiError(error, { url, method });

    throw error;
  }
};

/**
 * 공통 fetch 래퍼. API 프록시 경로 변환, 타임아웃, JSON 직렬화,
 * 에러 변환(FetchError), Sentry 리포팅을 일괄 처리한다.
 */
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
