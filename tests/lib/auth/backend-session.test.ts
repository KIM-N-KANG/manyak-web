import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as BackendClient from '@/lib/auth/backend-client';

// vi.mock 팩토리가 참조하는 값은 호이스팅 TDZ를 피하려 vi.hoisted로 선언한다.
const tokenCookiesMock = vi.hoisted(() => ({
  readBackendSessionTokens: vi.fn(),
  readRefreshTokenCookie: vi.fn(),
  writeBackendSessionTokens: vi.fn(),
  clearBackendSession: vi.fn(),
  hasNextAuthSessionCookie: vi.fn(),
}));

const inviteCookieMock = vi.hoisted(() => ({
  readInviteCodeCookie: vi.fn(),
  clearInviteCodeCookie: vi.fn(),
}));

vi.mock('@/lib/auth/token-cookies', () => tokenCookiesMock);
vi.mock('@/lib/auth/invite-cookie', () => inviteCookieMock);
// 함수만 목킹하고 BackendAuthError 클래스는 실제 구현을 유지한다
// (ensureFreshAccessToken의 원인 분류가 instanceof로 판별하기 때문).
vi.mock('@/lib/auth/backend-client', async (importActual) => {
  const actual = await importActual<typeof BackendClient>();

  return {
    ...actual,
    refreshOnServer: vi.fn(),
    loginWithGoogleOnServer: vi.fn(),
    fetchMeOnServer: vi.fn(),
  };
});

import {
  ensureFreshAccessToken,
  establishBackendSession,
} from '@/lib/auth/backend-session';

beforeEach(() => {
  vi.clearAllMocks();
  // 기본값: NextAuth 세션 쿠키 없음, refresh 쿠키 없음, 초대 쿠키 없음. 개별 케이스에서만 override.
  tokenCookiesMock.hasNextAuthSessionCookie.mockResolvedValue(false);
  tokenCookiesMock.readRefreshTokenCookie.mockResolvedValue(null);
  inviteCookieMock.readInviteCodeCookie.mockResolvedValue(null);
});

describe('ensureFreshAccessToken', () => {
  it('refresh 토큰도 NextAuth 세션 쿠키도 없으면 게스트 상태를 반환한다', async () => {
    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue(null);
    tokenCookiesMock.readRefreshTokenCookie.mockResolvedValue(null);
    tokenCookiesMock.hasNextAuthSessionCookie.mockResolvedValue(false);

    await expect(ensureFreshAccessToken(0)).resolves.toEqual({
      status: 'guest',
    });
    expect(tokenCookiesMock.clearBackendSession).not.toHaveBeenCalled();
  });

  it('refresh 토큰이 없는데 NextAuth 세션 쿠키가 있으면(복구 불가) 세션을 폐기하고 만료 상태를 반환한다', async () => {
    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue(null);
    tokenCookiesMock.readRefreshTokenCookie.mockResolvedValue(null);
    tokenCookiesMock.hasNextAuthSessionCookie.mockResolvedValue(true);

    await expect(ensureFreshAccessToken(0)).resolves.toEqual({
      status: 'expired',
    });
    expect(tokenCookiesMock.clearBackendSession).toHaveBeenCalled();
  });

  it('access 토큰이 없어도 refresh 토큰이 있으면 재발급해 로그인 상태를 복구한다', async () => {
    const { refreshOnServer } = await import('@/lib/auth/backend-client');

    // access·expiresAt이 없어 readBackendSessionTokens는 null이지만 refresh 쿠키는 살아 있다.
    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue(null);
    tokenCookiesMock.readRefreshTokenCookie.mockResolvedValue('refresh-live');
    vi.mocked(refreshOnServer).mockResolvedValue({
      accessToken: 'recovered',
      refreshToken: 'refresh-next',
      expiresIn: 1800,
    });

    await expect(ensureFreshAccessToken(1_000)).resolves.toEqual({
      status: 'authenticated',
      accessToken: 'recovered',
    });
    expect(tokenCookiesMock.writeBackendSessionTokens).toHaveBeenCalled();
    expect(tokenCookiesMock.clearBackendSession).not.toHaveBeenCalled();
  });

  it('access는 없고 refresh만 있는데 재발급이 4xx로 거절되면 세션을 폐기하고 만료 상태를 반환한다', async () => {
    const { refreshOnServer, BackendAuthError } =
      await import('@/lib/auth/backend-client');

    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue(null);
    tokenCookiesMock.readRefreshTokenCookie.mockResolvedValue('refresh-dead');
    vi.mocked(refreshOnServer).mockRejectedValue(
      new BackendAuthError(401, 'refresh token expired'),
    );

    await expect(ensureFreshAccessToken(1_000)).resolves.toEqual({
      status: 'expired',
    });
    expect(tokenCookiesMock.clearBackendSession).toHaveBeenCalled();
  });

  it('access는 없고 refresh만 있는데 재발급이 일시 실패하면 세션을 보존하고 게스트로 처리한다', async () => {
    const { refreshOnServer } = await import('@/lib/auth/backend-client');

    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue(null);
    tokenCookiesMock.readRefreshTokenCookie.mockResolvedValue('refresh-live-2');
    vi.mocked(refreshOnServer).mockRejectedValue(new TypeError('fetch failed'));

    await expect(ensureFreshAccessToken(1_000)).resolves.toEqual({
      status: 'guest',
    });
    expect(tokenCookiesMock.clearBackendSession).not.toHaveBeenCalled();
  });

  it('만료가 임박하지 않으면 기존 access 토큰으로 인증 상태를 반환한다', async () => {
    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: 1_000_000,
    });

    await expect(ensureFreshAccessToken(1_000)).resolves.toEqual({
      status: 'authenticated',
      accessToken: 'access',
    });
  });

  it('만료 임박이면 재발급 후 새 토큰을 저장하고 인증 상태를 반환한다', async () => {
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

    await expect(ensureFreshAccessToken(1_000)).resolves.toEqual({
      status: 'authenticated',
      accessToken: 'fresh',
    });
    expect(tokenCookiesMock.writeBackendSessionTokens).toHaveBeenCalled();
  });

  it('재발급이 4xx로 확정 거절되면 세션을 폐기하고 만료 상태를 반환한다', async () => {
    const { refreshOnServer, BackendAuthError } =
      await import('@/lib/auth/backend-client');

    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue({
      accessToken: 'stale',
      refreshToken: 'refresh-3',
      expiresAt: 1_000,
    });
    vi.mocked(refreshOnServer).mockRejectedValue(
      new BackendAuthError(401, 'refresh token revoked'),
    );

    await expect(ensureFreshAccessToken(1_000)).resolves.toEqual({
      status: 'expired',
    });
    expect(tokenCookiesMock.clearBackendSession).toHaveBeenCalled();
  });

  it('재발급이 5xx로 일시 실패하면 세션을 보존하고 기존 토큰으로 인증 상태를 반환한다', async () => {
    const { refreshOnServer, BackendAuthError } =
      await import('@/lib/auth/backend-client');

    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue({
      accessToken: 'stale',
      refreshToken: 'refresh-4',
      expiresAt: 1_000,
    });
    vi.mocked(refreshOnServer).mockRejectedValue(
      new BackendAuthError(503, 'service unavailable'),
    );

    await expect(ensureFreshAccessToken(1_000)).resolves.toEqual({
      status: 'authenticated',
      accessToken: 'stale',
    });
    expect(tokenCookiesMock.clearBackendSession).not.toHaveBeenCalled();
  });

  it('재발급이 네트워크 오류로 실패하면 세션을 보존하고 기존 토큰으로 인증 상태를 반환한다', async () => {
    const { refreshOnServer } = await import('@/lib/auth/backend-client');

    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue({
      accessToken: 'stale',
      refreshToken: 'refresh-5',
      expiresAt: 1_000,
    });
    vi.mocked(refreshOnServer).mockRejectedValue(new TypeError('fetch failed'));

    await expect(ensureFreshAccessToken(1_000)).resolves.toEqual({
      status: 'authenticated',
      accessToken: 'stale',
    });
    expect(tokenCookiesMock.clearBackendSession).not.toHaveBeenCalled();
  });
});

describe('establishBackendSession', () => {
  it('login→me 순으로 호출되고, me 검증 후에 writeBackendSessionTokens가 호출되며, 프로필을 반환한다', async () => {
    const { loginWithGoogleOnServer, fetchMeOnServer } =
      await import('@/lib/auth/backend-client');

    const callOrder: string[] = [];

    vi.mocked(loginWithGoogleOnServer).mockImplementation(async () => {
      callOrder.push('login');

      return {
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        expiresIn: 1800,
      };
    });
    vi.mocked(fetchMeOnServer).mockImplementation(async () => {
      callOrder.push('me');

      return {
        id: 'user-1',
        nickname: '만냐',
        profileImageUrl: 'https://example.com/a.png',
      };
    });
    tokenCookiesMock.writeBackendSessionTokens.mockImplementation(async () => {
      callOrder.push('write');
    });

    await expect(establishBackendSession('id-token')).resolves.toEqual({
      userId: 'user-1',
      nickname: '만냐',
      profileImageUrl: 'https://example.com/a.png',
    });

    expect(callOrder).toEqual(['login', 'me', 'write']);
    expect(loginWithGoogleOnServer).toHaveBeenCalledWith('id-token', null);
    expect(fetchMeOnServer).toHaveBeenCalledWith('access-1');
  });

  it('초대 쿠키가 있으면 코드를 로그인에 전달하고, 세션 수립 성공 후 쿠키를 삭제한다', async () => {
    const { loginWithGoogleOnServer, fetchMeOnServer } =
      await import('@/lib/auth/backend-client');

    inviteCookieMock.readInviteCodeCookie.mockResolvedValue('CW6VZX7D');
    vi.mocked(loginWithGoogleOnServer).mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 1800,
    });
    vi.mocked(fetchMeOnServer).mockResolvedValue({
      id: 'user-1',
      nickname: '만냐',
      profileImageUrl: null,
    });

    await establishBackendSession('id-token');

    expect(loginWithGoogleOnServer).toHaveBeenCalledWith(
      'id-token',
      'CW6VZX7D',
    );
    expect(inviteCookieMock.clearInviteCodeCookie).toHaveBeenCalled();
  });

  it('초대 쿠키가 없으면 삭제를 시도하지 않는다', async () => {
    const { loginWithGoogleOnServer, fetchMeOnServer } =
      await import('@/lib/auth/backend-client');

    vi.mocked(loginWithGoogleOnServer).mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 1800,
    });
    vi.mocked(fetchMeOnServer).mockResolvedValue({
      id: 'user-1',
      nickname: '만냐',
      profileImageUrl: null,
    });

    await establishBackendSession('id-token');

    expect(inviteCookieMock.clearInviteCodeCookie).not.toHaveBeenCalled();
  });

  it('로그인이 실패하면 초대 쿠키를 남겨 다음 시도에서 다시 전달되게 한다', async () => {
    const { loginWithGoogleOnServer, BackendAuthError } =
      await import('@/lib/auth/backend-client');

    inviteCookieMock.readInviteCodeCookie.mockResolvedValue('CW6VZX7D');
    vi.mocked(loginWithGoogleOnServer).mockRejectedValue(
      new BackendAuthError(401, 'invalid token'),
    );

    await expect(establishBackendSession('id-token')).rejects.toThrow();
    expect(inviteCookieMock.clearInviteCodeCookie).not.toHaveBeenCalled();
  });

  it('세션 수립 도중(me 조회) 실패해도 초대 쿠키를 남긴다', async () => {
    const { loginWithGoogleOnServer, fetchMeOnServer } =
      await import('@/lib/auth/backend-client');

    inviteCookieMock.readInviteCodeCookie.mockResolvedValue('CW6VZX7D');
    vi.mocked(loginWithGoogleOnServer).mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 1800,
    });
    vi.mocked(fetchMeOnServer).mockRejectedValue(new Error('me failed'));

    await expect(establishBackendSession('id-token')).rejects.toThrow(
      'me failed',
    );
    expect(inviteCookieMock.clearInviteCodeCookie).not.toHaveBeenCalled();
  });

  it('fetchMeOnServer가 reject되면 throw가 전파되고 writeBackendSessionTokens는 호출되지 않는다', async () => {
    const { loginWithGoogleOnServer, fetchMeOnServer } =
      await import('@/lib/auth/backend-client');

    vi.mocked(loginWithGoogleOnServer).mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 1800,
    });
    vi.mocked(fetchMeOnServer).mockRejectedValue(new Error('me failed'));

    await expect(establishBackendSession('id-token')).rejects.toThrow(
      'me failed',
    );
    expect(tokenCookiesMock.writeBackendSessionTokens).not.toHaveBeenCalled();
  });

  it('me.id가 없으면 throw하고 writeBackendSessionTokens는 호출되지 않는다', async () => {
    const { loginWithGoogleOnServer, fetchMeOnServer } =
      await import('@/lib/auth/backend-client');

    vi.mocked(loginWithGoogleOnServer).mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 1800,
    });
    vi.mocked(fetchMeOnServer).mockResolvedValue({
      id: undefined,
      nickname: '만냐',
      profileImageUrl: null,
    });

    await expect(establishBackendSession('id-token')).rejects.toThrow(
      '사용자 정보 응답에 id가 없습니다.',
    );
    expect(tokenCookiesMock.writeBackendSessionTokens).not.toHaveBeenCalled();
  });

  it('tokens.accessToken이 없으면 throw하고 fetchMeOnServer·writeBackendSessionTokens는 호출되지 않는다', async () => {
    const { loginWithGoogleOnServer, fetchMeOnServer } =
      await import('@/lib/auth/backend-client');

    vi.mocked(loginWithGoogleOnServer).mockResolvedValue({
      accessToken: undefined,
      refreshToken: 'refresh-1',
      expiresIn: 1800,
    });

    await expect(establishBackendSession('id-token')).rejects.toThrow(
      '토큰 응답에 accessToken이 없습니다.',
    );
    expect(fetchMeOnServer).not.toHaveBeenCalled();
    expect(tokenCookiesMock.writeBackendSessionTokens).not.toHaveBeenCalled();
  });
});
