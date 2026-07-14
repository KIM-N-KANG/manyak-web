export const API_TIMEOUT_MS = 180 * 1000;

/**
 * 외부 취소 신호를 유지하면서 지정 시간이 지나면 TimeoutError로 요청을 중단한다.
 * TimeoutError는 사용자 취소(AbortError)와 구분해 백엔드 지연·장애로 관측할 수 있다.
 *
 * @param url 요청 URL
 * @param options fetch 요청 옵션(외부 signal 포함 가능)
 * @param timeout 타임아웃(ms), 기본값 API_TIMEOUT_MS
 * @returns fetch 응답
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = API_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const abortRequest = () => controller.abort(externalSignal?.reason);
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
}
