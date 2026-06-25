import { FetchError, resolveApiProxyUrl } from '@/lib/custom-fetch';
import { captureApiError } from '@/lib/monitoring/sentry';

export type BodyType<BodyData> = BodyData;

export type ErrorType<ErrorData> = FetchError & {
  data: ErrorData;
};

const API_TIMEOUT_MS = 120 * 1000;

const resolveHeaders = (headers?: HeadersInit) => {
  const resolvedHeaders = new Headers(headers);

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
