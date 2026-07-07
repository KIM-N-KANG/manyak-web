import { describe, expect, it, vi } from 'vitest';

import { refreshWithDedup } from '@/lib/auth/refresh-dedup';

describe('refreshWithDedup', () => {
  it('같은 refresh 토큰의 동시 재발급은 실행을 1회만 수행한다', async () => {
    const executor = vi.fn().mockResolvedValue({ accessToken: 'new' });

    const [first, second] = await Promise.all([
      refreshWithDedup('token-a', executor),
      refreshWithDedup('token-a', executor),
    ]);

    expect(executor).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ accessToken: 'new' });
    expect(second).toEqual({ accessToken: 'new' });
  });

  it('성공한 재발급 결과는 짧게 캐시돼 같은 토큰 재요청 시 재실행하지 않는다', async () => {
    // 1회용 refresh 토큰을 몰린 요청들이 각자 다시 쓰면 재사용 탐지에 걸리므로,
    // 완료 직후에도 잠깐은 같은 결과를 공유한다.
    const executor = vi.fn().mockResolvedValue({ accessToken: 'new' });

    await refreshWithDedup('token-b', executor, 0);
    await refreshWithDedup('token-b', executor, 1_000);

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it('캐시 유효기간이 지나면 같은 토큰도 다시 재발급한다', async () => {
    const executor = vi.fn().mockResolvedValue({ accessToken: 'new' });

    await refreshWithDedup('token-f', executor, 0);
    await refreshWithDedup('token-f', executor, 60_000);

    expect(executor).toHaveBeenCalledTimes(2);
  });

  it('다른 refresh 토큰은 별도로 실행한다', async () => {
    const executor = vi.fn().mockResolvedValue({ accessToken: 'new' });

    await Promise.all([
      refreshWithDedup('token-c', executor),
      refreshWithDedup('token-d', executor),
    ]);

    expect(executor).toHaveBeenCalledTimes(2);
  });

  it('실패도 대기자 전원에게 전파되고 in-flight를 비운다', async () => {
    const executor = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ accessToken: 'retry' });

    await expect(refreshWithDedup('token-e', executor)).rejects.toThrow('boom');
    await expect(refreshWithDedup('token-e', executor)).resolves.toEqual({
      accessToken: 'retry',
    });
  });
});
