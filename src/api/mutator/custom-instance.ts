import { FetchError, resolveApiProxyUrl } from '@/lib/custom-fetch';
import { getAnalyticsIdentityHeaders } from '@/observability/analytics/identity';
import { captureApiError } from '@/observability/monitoring/sentry';

export type BodyType<BodyData> = BodyData;

export type ErrorType<ErrorData> = FetchError & {
  data: ErrorData;
};

const API_TIMEOUT_MS = 120 * 1000;

const resolveHeaders = (headers?: HeadersInit) => {
  // 익명 식별자 헤더를 기본값으로 깔고, 호출부가 지정한 헤더가 우선하도록 덮어쓴다.
  const resolvedHeaders = new Headers(getAnalyticsIdentityHeaders());

  new Headers(headers).forEach((value, key) => {
    resolvedHeaders.set(key, value);
  });

  if (!resolvedHeaders.has('Content-Type')) {
    resolvedHeaders.set('Content-Type', 'application/json');
  }

  return resolvedHeaders;
};

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

const parseResponseData = async (response: Response) => {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get('Content-Type') ?? '';

  if (contentType.includes('text/event-stream')) {
    if (response.body) {
      return response.body;
    }

    return response.text();
  }

  const text = await response.text();

  if (!text) {
    return undefined;
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(text);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const parseErrorData = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const customInstance = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  try {
    const response = await fetchWithTimeout(
      resolveApiProxyUrl(url),
      {
        ...options,
        headers: resolveHeaders(options.headers),
      },
      API_TIMEOUT_MS,
    );

    if (!response.ok) {
      throw new FetchError(
        '요청 처리에 실패했습니다.',
        response.status,
        await parseErrorData(response),
      );
    }

    return {
      data: await parseResponseData(response),
      status: response.status,
      headers: response.headers,
    } as T;
  } catch (error) {
    captureApiError(error, { url, method: options.method });

    throw error;
  }
};
