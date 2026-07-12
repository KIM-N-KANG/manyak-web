import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captureApiError = vi.fn();

vi.mock('@/observability/monitoring/sentry', () => ({
  captureApiError: (...args: unknown[]) => captureApiError(...args),
}));

import { customFetch } from '@/lib/custom-fetch';

const API_TIMEOUT_MS = 180 * 1000;

/** signal이 abort되면 그 reason으로 거부하는 fetch 목. */
function abortAwareFetch() {
  return vi.fn(
    (_url: string, options: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = options.signal;

        signal?.addEventListener('abort', () => {
          reject(signal.reason);
        });
      }),
  );
}

describe('customFetch 타임아웃', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    captureApiError.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('기본 타임아웃은 180초다', async () => {
    const fetchMock = abortAwareFetch();

    vi.stubGlobal('fetch', fetchMock);

    const promise = customFetch.get('/stories');
    const assertion = expect(promise).rejects.toMatchObject({
      name: 'TimeoutError',
    });

    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS - 1);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(options.signal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await assertion;
  });

  it('타임아웃은 AbortError가 아닌 TimeoutError로 거부하고 Sentry로 캡처한다', async () => {
    vi.stubGlobal('fetch', abortAwareFetch());

    const promise = customFetch.get('/stories', { timeout: 1000 });
    const assertion = expect(promise).rejects.toMatchObject({
      name: 'TimeoutError',
    });

    await vi.advanceTimersByTimeAsync(1000);
    await assertion;

    expect(captureApiError).toHaveBeenCalledTimes(1);

    const [error] = captureApiError.mock.calls[0];

    expect((error as Error).name).toBe('TimeoutError');
  });

  it('외부 신호로 인한 사용자 취소는 AbortError로 거부한다', async () => {
    vi.stubGlobal('fetch', abortAwareFetch());

    const controller = new AbortController();
    const promise = customFetch.get('/stories', {
      timeout: 1000,
      signal: controller.signal,
    });
    const assertion = expect(promise).rejects.toMatchObject({
      name: 'AbortError',
    });

    controller.abort();
    await assertion;
  });
});
