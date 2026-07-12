import { notifyIfSessionExpired } from '@/lib/auth/session-expiry';
import { getAnalyticsIdentityHeaders } from '@/observability/analytics/identity';
import { captureApiError } from '@/observability/monitoring/sentry';

import { FetchError, getApiErrorCode } from './api-error';
import { fetchWithTimeout } from './fetch-with-timeout';

export { FetchError, getApiErrorCode };

/**
 * 에러 응답 바디를 파싱한다. JSON이면 객체로, JSON이 아니면 원문 문자열로, 비어 있으면 null.
 * `FetchError.data`에 담아 {@link getApiErrorCode} 등이 `code`를 읽을 수 있게 한다.
 */
export async function parseErrorResponseBody(
  response: Response,
): Promise<unknown> {
  const text = await response.text().catch(() => '');

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const API_PROXY_BASE_PATH = '/api';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** customFetch 요청에 사용하는 설정. RequestInit에 타임아웃 옵션을 더한 형태다. */
export interface RequestConfig extends Omit<RequestInit, 'method' | 'body'> {
  /** 요청 타임아웃(ms). 기본값은 180초 */
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

const request = async <T>(
  method: RequestMethod,
  url: string,
  data?: unknown,
  config: RequestConfig = {},
): Promise<T> => {
  const { timeout, ...restConfig } = config;

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

    // 프록시가 세션 만료(리프레시 확정 거절)를 알리면 능동 로그아웃 신호를 발행한다.
    // 성공/실패 응답 모두에서 감지되어야 하므로 ok 분기보다 먼저 확인한다.
    notifyIfSessionExpired(response.headers);

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
