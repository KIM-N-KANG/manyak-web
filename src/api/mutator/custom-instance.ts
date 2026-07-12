import { notifyIfSessionExpired } from '@/lib/auth/session-expiry';
import { FetchError, resolveApiProxyUrl } from '@/lib/custom-fetch';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { getAnalyticsIdentityHeaders } from '@/observability/analytics/identity';
import { captureApiError } from '@/observability/monitoring/sentry';

/** Orval mutator가 요구하는 요청 바디 타입. */
export type BodyType<BodyData> = BodyData;

/** Orval mutator가 요구하는 에러 타입. FetchError에 응답 바디 타입을 결합한다. */
export type ErrorType<ErrorData> = FetchError & {
  data: ErrorData;
};

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

/**
 * Orval이 생성한 API 클라이언트가 사용하는 공통 fetch 인스턴스.
 * 익명 식별자 헤더·타임아웃을 적용하고, 실패 시 FetchError를 던지며 Sentry로 보고한다.
 */
export const customInstance = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  try {
    const response = await fetchWithTimeout(resolveApiProxyUrl(url), {
      ...options,
      headers: resolveHeaders(options.headers),
    });

    // 프록시가 세션 만료(리프레시 확정 거절)를 알리면 능동 로그아웃 신호를 발행한다.
    // 성공/실패 응답 모두에서 감지되어야 하므로 ok 분기보다 먼저 확인한다.
    notifyIfSessionExpired(response.headers);

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
