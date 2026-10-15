import { describe, expect, it, vi } from 'vitest';

import { FetchError } from '@/lib/api-error';
import { createSessionRefreshGate } from '@/lib/auth/session-refresh-gate';

const NOW = 1_000_000;
const EXPIRING = NOW + 60_000;
const FRESH = NOW + 30 * 60_000;

/**
 * 테스트용 게이트를 만든다. 재발급은 resolve를 부를 때까지 진행 중으로 남는다.
 *
 * @param expiresAt 쿠키의 만료 시각
 * @returns 게이트, 재발급 mock, 진행 중 재발급 완료·거절 함수
 */
function setup(expiresAt: number | null) {
  let current = expiresAt;
  let settle: { resolve: () => void; reject: (error: unknown) => void } | null =
    null;
  const refresh = vi.fn(
    () =>
      new Promise<void>((resolve, reject) => {
        settle = { resolve, reject };
      }),
  );
  const gate = createSessionRefreshGate({
    readExpiresAt: () => current,
    refresh,
    now: () => NOW,
  });

  return {
    gate,
    refresh,
    setExpiresAt: (value: number | null) => {
      current = value;
    },
    resolve: () => settle?.resolve(),
    reject: (error: unknown) => settle?.reject(error),
  };
}

describe('createSessionRefreshGate', () => {
  it('만료가 임박하면 동시에 들어온 요청이 재발급 한 번을 함께 기다린다', async () => {
    const { gate, refresh, setExpiresAt, resolve } = setup(EXPIRING);

    const waits = [gate(), gate(), gate()];

    expect(refresh).toHaveBeenCalledOnce();

    setExpiresAt(FRESH);
    resolve();
    await Promise.all(waits);
    await gate();

    expect(refresh).toHaveBeenCalledOnce();
  });

  it('만료가 멀거나 회원 쿠키가 없으면 재발급하지 않는다', async () => {
    const fresh = setup(FRESH);
    const guest = setup(null);

    await fresh.gate();
    await guest.gate();

    expect(fresh.refresh).not.toHaveBeenCalled();
    expect(guest.refresh).not.toHaveBeenCalled();
  });

  it('서버가 회전하지 않아 만료 시각이 그대로면 같은 값으로 다시 부르지 않는다', async () => {
    const { gate, refresh, resolve } = setup(EXPIRING);

    const first = gate();

    resolve();
    await first;
    await gate();

    expect(refresh).toHaveBeenCalledOnce();
  });

  it('세션 만료 거절은 기다리던 요청 모두에 전달된다', async () => {
    const { gate, reject } = setup(EXPIRING);
    const expired = new FetchError('세션이 만료되었습니다.', 401, null);

    const waits = [gate(), gate()];

    reject(expired);

    for (const wait of waits) {
      await expect(wait).rejects.toBe(expired);
    }
  });
});
