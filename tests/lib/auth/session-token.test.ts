import { encode } from 'next-auth/jwt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock 팩토리가 참조하는 값은 호이스팅 TDZ를 피하려 vi.hoisted로 선언한다.
const cookieStoreMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

const headersMock = vi.hoisted(() => ({
  cookies: vi.fn(),
}));

vi.mock('next/headers', () => headersMock);

import { restoreSessionClaims } from '@/lib/auth/session-token';

const SECRET = 'test-secret';

/**
 * 쿠키 스토어 목이 주어진 이름→값 맵을 반환하도록 설정한다.
 */
function mockCookies(map: Record<string, string>): void {
  cookieStoreMock.get.mockImplementation((name: string) =>
    name in map ? { name, value: map[name] } : undefined,
  );
  headersMock.cookies.mockResolvedValue(cookieStoreMock);
}

/**
 * 주어진 클레임을 실제 Auth.js encode로 세션 토큰 문자열로 만든다.
 */
async function encodeSessionToken(
  claims: Record<string, unknown>,
  salt: string,
): Promise<string> {
  return encode({ token: claims, secret: SECRET, salt });
}

beforeEach(() => {
  vi.stubEnv('AUTH_SECRET', SECRET);
  cookieStoreMock.get.mockReset();
  headersMock.cookies.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('restoreSessionClaims', () => {
  it('세션 쿠키를 복호화해 기존 클레임을 반환한다', async () => {
    const token = await encodeSessionToken(
      { userId: 'user-1', nickname: '만냐' },
      'authjs.session-token',
    );

    mockCookies({ 'authjs.session-token': token });

    const claims = await restoreSessionClaims();

    expect(claims?.userId).toBe('user-1');
    expect(claims?.nickname).toBe('만냐');
  });

  it('__Secure- 접두 쿠키는 그 이름을 salt로 복호화한다', async () => {
    const token = await encodeSessionToken(
      { userId: 'user-2' },
      '__Secure-authjs.session-token',
    );

    mockCookies({ '__Secure-authjs.session-token': token });

    const claims = await restoreSessionClaims();

    expect(claims?.userId).toBe('user-2');
  });

  it('청크로 분할된 세션 쿠키를 이어 붙여 복호화한다', async () => {
    const token = await encodeSessionToken(
      { userId: 'user-3' },
      'authjs.session-token',
    );
    const half = Math.ceil(token.length / 2);

    mockCookies({
      'authjs.session-token.0': token.slice(0, half),
      'authjs.session-token.1': token.slice(half),
    });

    const claims = await restoreSessionClaims();

    expect(claims?.userId).toBe('user-3');
  });

  it('세션 쿠키가 없으면 null을 반환한다', async () => {
    mockCookies({});

    await expect(restoreSessionClaims()).resolves.toBeNull();
  });

  it('손상된 토큰이면 null을 반환한다', async () => {
    mockCookies({ 'authjs.session-token': 'broken-token' });

    await expect(restoreSessionClaims()).resolves.toBeNull();
  });
});
