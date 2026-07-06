import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock 팩토리는 mock 대상 모듈 import 시점에 실행되므로, 참조하는 값은 vi.hoisted로 선언한다.
const cookieStore = vi.hoisted(() => new Map<string, string>());

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieStore.has(name)
        ? { name, value: cookieStore.get(name) as string }
        : undefined,
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

import {
  clearBackendSession,
  readBackendSessionTokens,
  writeBackendSessionTokens,
} from '@/lib/auth/token-cookies';

beforeEach(() => {
  cookieStore.clear();
});

describe('writeBackendSessionTokens / readBackendSessionTokens', () => {
  it('토큰 쌍과 만료 시각을 저장하고 다시 읽는다', async () => {
    await writeBackendSessionTokens(
      { accessToken: 'access', refreshToken: 'refresh', expiresIn: 1800 },
      1_000,
    );

    await expect(readBackendSessionTokens()).resolves.toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: 1_000 + 1800 * 1000,
    });
  });

  it('필수 값이 빠진 토큰 응답은 저장하지 않고 던진다', async () => {
    await expect(
      writeBackendSessionTokens({ accessToken: 'access' }, 1_000),
    ).rejects.toThrow();
    await expect(readBackendSessionTokens()).resolves.toBeNull();
  });
});

describe('readBackendSessionTokens', () => {
  it('쿠키가 하나라도 없으면 null을 반환한다', async () => {
    await expect(readBackendSessionTokens()).resolves.toBeNull();
  });
});

describe('clearBackendSession', () => {
  it('BFF 쿠키를 모두 폐기한다', async () => {
    await writeBackendSessionTokens(
      { accessToken: 'access', refreshToken: 'refresh', expiresIn: 1800 },
      1_000,
    );
    await clearBackendSession();

    await expect(readBackendSessionTokens()).resolves.toBeNull();
  });
});
