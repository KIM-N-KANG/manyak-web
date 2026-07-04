import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captureApiError = vi.fn();

vi.mock('@/observability/monitoring/sentry', () => ({
  captureApiError: (...args: unknown[]) => captureApiError(...args),
}));

import { customInstance } from '@/api/mutator/custom-instance';

const API_TIMEOUT_MS = 120 * 1000;

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

describe('customInstance 타임아웃', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    captureApiError.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('타임아웃은 AbortError가 아닌 TimeoutError로 거부하고 Sentry로 캡처한다', async () => {
    vi.stubGlobal('fetch', abortAwareFetch());

    const promise = customInstance('/stories');
    const assertion = expect(promise).rejects.toMatchObject({
      name: 'TimeoutError',
    });

    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS);
    await assertion;

    expect(captureApiError).toHaveBeenCalledTimes(1);

    const [error] = captureApiError.mock.calls[0];

    expect((error as Error).name).toBe('TimeoutError');
  });
});
