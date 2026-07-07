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
  hasNextAuthSessionCookie,
  readBackendSessionTokens,
  readRefreshTokenCookie,
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

describe('readRefreshTokenCookie', () => {
  it('refresh 쿠키가 없으면 null을 반환한다', async () => {
    await expect(readRefreshTokenCookie()).resolves.toBeNull();
  });

  it('access·expiresAt이 없어도 refresh 쿠키가 있으면 그 값을 반환한다', async () => {
    cookieStore.set('manyak_session_refresh', 'refresh-value');

    await expect(readRefreshTokenCookie()).resolves.toBe('refresh-value');
  });
});

describe('hasNextAuthSessionCookie', () => {
  it('NextAuth 세션 쿠키가 없으면 false를 반환한다', async () => {
    await expect(hasNextAuthSessionCookie()).resolves.toBe(false);
  });

  it('일반 NextAuth 세션 쿠키가 있으면 true를 반환한다', async () => {
    cookieStore.set('authjs.session-token', 'jwt-value');

    await expect(hasNextAuthSessionCookie()).resolves.toBe(true);
  });

  it('보안(__Secure-) NextAuth 세션 쿠키가 있으면 true를 반환한다', async () => {
    cookieStore.set('__Secure-authjs.session-token', 'jwt-value');

    await expect(hasNextAuthSessionCookie()).resolves.toBe(true);
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
