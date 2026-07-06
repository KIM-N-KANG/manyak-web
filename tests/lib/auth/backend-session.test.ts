import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock 팩토리가 참조하는 값은 호이스팅 TDZ를 피하려 vi.hoisted로 선언한다.
const tokenCookiesMock = vi.hoisted(() => ({
  readBackendSessionTokens: vi.fn(),
  writeBackendSessionTokens: vi.fn(),
  clearBackendSession: vi.fn(),
}));

vi.mock('@/lib/auth/token-cookies', () => tokenCookiesMock);
vi.mock('@/lib/auth/backend-client', () => ({
  refreshOnServer: vi.fn(),
  loginWithGoogleOnServer: vi.fn(),
  fetchMeOnServer: vi.fn(),
}));

import {
  ensureFreshAccessToken,
  refreshWithDedup,
} from '@/lib/auth/backend-session';

beforeEach(() => {
  vi.clearAllMocks();
});

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

  it('완료 후 새 호출은 다시 실행한다', async () => {
    const executor = vi.fn().mockResolvedValue({ accessToken: 'new' });

    await refreshWithDedup('token-b', executor);
    await refreshWithDedup('token-b', executor);

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

describe('ensureFreshAccessToken', () => {
  it('토큰 쿠키가 없으면(게스트) null을 반환한다', async () => {
    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue(null);

    await expect(ensureFreshAccessToken(0)).resolves.toBeNull();
  });

  it('만료가 임박하지 않으면 기존 access 토큰을 반환한다', async () => {
    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: 1_000_000,
    });

    await expect(ensureFreshAccessToken(1_000)).resolves.toBe('access');
  });

  it('만료 임박이면 재발급 후 새 토큰을 저장하고 반환한다', async () => {
    const { refreshOnServer } = await import('@/lib/auth/backend-client');

    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue({
      accessToken: 'stale',
      refreshToken: 'refresh-1',
      expiresAt: 1_000,
    });
    vi.mocked(refreshOnServer).mockResolvedValue({
      accessToken: 'fresh',
      refreshToken: 'refresh-2',
      expiresIn: 1800,
    });

    await expect(ensureFreshAccessToken(1_000)).resolves.toBe('fresh');
    expect(tokenCookiesMock.writeBackendSessionTokens).toHaveBeenCalled();
  });

  it('재발급 실패면 세션을 폐기하고 null을 반환한다', async () => {
    const { refreshOnServer } = await import('@/lib/auth/backend-client');

    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue({
      accessToken: 'stale',
      refreshToken: 'refresh-3',
      expiresAt: 1_000,
    });
    vi.mocked(refreshOnServer).mockRejectedValue(new Error('revoked'));

    await expect(ensureFreshAccessToken(1_000)).resolves.toBeNull();
    expect(tokenCookiesMock.clearBackendSession).toHaveBeenCalled();
  });
});
