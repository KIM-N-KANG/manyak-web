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

const identityServerMock = vi.hoisted(() => ({
  readAmplitudeDeviceIdOnServer: vi.fn(),
}));

const handoffCookieMock = vi.hoisted(() => ({
  readHandoffCodeOnServer: vi.fn(),
}));

const signupConsentCookieMock = vi.hoisted(() => ({
  readPendingSignupConsent: vi.fn(),
  writePendingSignupConsent: vi.fn(),
  clearPendingSignupConsent: vi.fn(),
}));

vi.mock('@/lib/auth/token-cookies', () => tokenCookiesMock);
vi.mock('@/observability/analytics/identity-server', () => identityServerMock);
vi.mock('@/lib/auth/handoff-cookie', () => handoffCookieMock);
// toPendingSignupConsent는 순수 함수라 실제 구현을 쓰고 쿠키 입출력만 목킹한다.
vi.mock('@/lib/auth/signup-consent-cookie', async (importActual) => ({
  ...(await importActual<object>()),
  ...signupConsentCookieMock,
}));
// 함수만 목킹하고 BackendAuthError 클래스는 실제 구현을 유지한다
// (ensureFreshAccessToken의 원인 분류가 instanceof로 판별하기 때문).
vi.mock('@/lib/auth/backend-client', async (importActual) => {
  const actual = await importActual<typeof BackendClient>();

  return {
    ...actual,
    refreshOnServer: vi.fn(),
    startSocialAuthOnServer: vi.fn(),
    completeSocialAuthOnServer: vi.fn(),
    fetchMeOnServer: vi.fn(),
  };
});

import {
  BackendAuthError,
  completeSocialAuthOnServer,
  fetchMeOnServer,
  startSocialAuthOnServer,
} from '@/lib/auth/backend-client';
import {
  authenticateSocialLogin,
  completeSignupConsent,
  ensureFreshAccessToken,
} from '@/lib/auth/backend-session';

beforeEach(() => {
  vi.clearAllMocks();
  // 기본값: NextAuth 세션 쿠키와 refresh 쿠키 없음. 개별 케이스에서만 override.
  tokenCookiesMock.hasNextAuthSessionCookie.mockResolvedValue(false);
  tokenCookiesMock.readRefreshTokenCookie.mockResolvedValue(null);
  identityServerMock.readAmplitudeDeviceIdOnServer.mockResolvedValue(undefined);
  handoffCookieMock.readHandoffCodeOnServer.mockResolvedValue(undefined);
  signupConsentCookieMock.readPendingSignupConsent.mockResolvedValue(null);
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

  it('access는 없고 refresh만 있는데 재발급이 일시 실패하면 세션을 보존하고 강등 상태를 반환한다', async () => {
    const { refreshOnServer } = await import('@/lib/auth/backend-client');

    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue(null);
    tokenCookiesMock.readRefreshTokenCookie.mockResolvedValue('refresh-live-2');
    vi.mocked(refreshOnServer).mockRejectedValue(new TypeError('fetch failed'));

    // 게스트로 처리하면 회원의 요청이 익명으로 백엔드에 전달돼 고아 콘텐츠가 되므로,
    // "회원인데 이번 요청은 인증 불가"를 구분하는 degraded로 신호한다.
    await expect(ensureFreshAccessToken(1_000)).resolves.toEqual({
      status: 'degraded',
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

  it('forceRefresh면 만료가 임박하지 않아도 재발급해 새 토큰을 반환한다', async () => {
    const { refreshOnServer } = await import('@/lib/auth/backend-client');

    tokenCookiesMock.readBackendSessionTokens.mockResolvedValue({
      accessToken: 'rejected-by-backend',
      refreshToken: 'refresh-force',
      expiresAt: 1_000_000,
    });
    vi.mocked(refreshOnServer).mockResolvedValue({
      accessToken: 'forced-fresh',
      refreshToken: 'refresh-force-2',
      expiresIn: 1800,
    });

    await expect(
      ensureFreshAccessToken(1_000, { forceRefresh: true }),
    ).resolves.toEqual({
      status: 'authenticated',
      accessToken: 'forced-fresh',
    });
    expect(refreshOnServer).toHaveBeenCalledWith('refresh-force');
    expect(tokenCookiesMock.writeBackendSessionTokens).toHaveBeenCalled();
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

const TOKENS = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresIn: 1800,
};

const ME = { id: 'user-1', nickname: '만냐', profileImageUrl: null };

const PENDING = {
  consentToken: 'pending-code',
  expiresAt: '2099-01-01T00:00:00Z',
  consents: { terms: { requiredVersion: 'v1.2', needsConsent: true } },
};

describe('authenticateSocialLogin', () => {
  it('COMPLETED면 소셜 인증→me 순으로 호출하고, me 검증 후에 토큰 쿠키를 쓰며, 프로필을 반환한다', async () => {
    const callOrder: string[] = [];

    vi.mocked(startSocialAuthOnServer).mockImplementation(async () => {
      callOrder.push('social');

      return { status: 'COMPLETED', token: { ...TOKENS, isNewUser: true } };
    });
    vi.mocked(fetchMeOnServer).mockImplementation(async () => {
      callOrder.push('me');

      return { ...ME, profileImageUrl: 'https://example.com/a.png' };
    });
    tokenCookiesMock.writeBackendSessionTokens.mockImplementation(async () => {
      callOrder.push('write');
    });

    await expect(
      authenticateSocialLogin('google', 'id-token'),
    ).resolves.toEqual({
      status: 'completed',
      profile: {
        userId: 'user-1',
        nickname: '만냐',
        profileImageUrl: 'https://example.com/a.png',
        isNewUser: true,
      },
    });

    expect(callOrder).toEqual(['social', 'me', 'write']);
    expect(startSocialAuthOnServer).toHaveBeenCalledWith(
      'google',
      'id-token',
      undefined,
      undefined,
    );
    expect(fetchMeOnServer).toHaveBeenCalledWith('access-1');
  });

  it('요청 쿠키의 Amplitude device_id와 핸드오프 코드를 소셜 인증 호출에 원문 그대로 전달한다', async () => {
    // 가입 시 게스트 체험 사용량 시드(스펙 §4-3-7)와 핸드오프 이관(§4-3-5)에 쓰인다.
    identityServerMock.readAmplitudeDeviceIdOnServer.mockResolvedValue(
      'amp-device-raw',
    );
    handoffCookieMock.readHandoffCodeOnServer.mockResolvedValue('handoff-code');
    vi.mocked(startSocialAuthOnServer).mockResolvedValue({
      status: 'COMPLETED',
      token: TOKENS,
    });
    vi.mocked(fetchMeOnServer).mockResolvedValue(ME);

    await authenticateSocialLogin('kakao', 'id-token');

    expect(startSocialAuthOnServer).toHaveBeenCalledWith(
      'kakao',
      'id-token',
      'amp-device-raw',
      'handoff-code',
    );
  });

  it('COMPLETED 토큰에 isNewUser가 없으면 기존 회원으로 반환한다', async () => {
    vi.mocked(startSocialAuthOnServer).mockResolvedValue({
      status: 'COMPLETED',
      token: TOKENS,
    });
    vi.mocked(fetchMeOnServer).mockResolvedValue(ME);

    await expect(
      authenticateSocialLogin('google', 'id-token'),
    ).resolves.toMatchObject({ profile: { isNewUser: false } });
  });

  it('COMPLETED 로그인은 이전 로그인이 남긴 대기 쿠키를 지운다', async () => {
    vi.mocked(startSocialAuthOnServer).mockResolvedValue({
      status: 'COMPLETED',
      token: TOKENS,
    });
    vi.mocked(fetchMeOnServer).mockResolvedValue(ME);

    await authenticateSocialLogin('google', 'id-token');

    expect(
      signupConsentCookieMock.clearPendingSignupConsent,
    ).toHaveBeenCalledOnce();
  });

  it('me가 실패하면 throw가 전파되고 토큰 쿠키를 쓰지 않는다', async () => {
    vi.mocked(startSocialAuthOnServer).mockResolvedValue({
      status: 'COMPLETED',
      token: TOKENS,
    });
    vi.mocked(fetchMeOnServer).mockRejectedValue(new Error('me failed'));

    await expect(authenticateSocialLogin('google', 'id-token')).rejects.toThrow(
      'me failed',
    );
    expect(tokenCookiesMock.writeBackendSessionTokens).not.toHaveBeenCalled();
  });

  it('me.id가 없으면 throw하고 토큰 쿠키를 쓰지 않는다', async () => {
    vi.mocked(startSocialAuthOnServer).mockResolvedValue({
      status: 'COMPLETED',
      token: TOKENS,
    });
    vi.mocked(fetchMeOnServer).mockResolvedValue({ ...ME, id: undefined });

    await expect(authenticateSocialLogin('google', 'id-token')).rejects.toThrow(
      '사용자 정보 응답에 id가 없습니다.',
    );
    expect(tokenCookiesMock.writeBackendSessionTokens).not.toHaveBeenCalled();
  });

  it('accessToken이 없으면 throw하고 me 조회·토큰 쿠키 쓰기를 하지 않는다', async () => {
    vi.mocked(startSocialAuthOnServer).mockResolvedValue({
      status: 'COMPLETED',
      token: { ...TOKENS, accessToken: undefined },
    });

    await expect(authenticateSocialLogin('google', 'id-token')).rejects.toThrow(
      '토큰 응답에 accessToken이 없습니다.',
    );
    expect(fetchMeOnServer).not.toHaveBeenCalled();
    expect(tokenCookiesMock.writeBackendSessionTokens).not.toHaveBeenCalled();
  });

  it('COMPLETED에 토큰이 없으면 실패시킨다', async () => {
    vi.mocked(startSocialAuthOnServer).mockResolvedValue({
      status: 'COMPLETED',
      token: null,
    });

    await expect(
      authenticateSocialLogin('google', 'id-token'),
    ).rejects.toThrow();
    expect(tokenCookiesMock.writeBackendSessionTokens).not.toHaveBeenCalled();
  });

  it('CONSENT_REQUIRED면 토큰 쿠키 없이 대기 쿠키만 쓴다', async () => {
    vi.mocked(startSocialAuthOnServer).mockResolvedValue({
      status: 'CONSENT_REQUIRED',
      isNewUser: true,
      ...PENDING,
    });

    await expect(
      authenticateSocialLogin('google', 'id-token'),
    ).resolves.toEqual({
      status: 'consent-required',
    });
    expect(
      signupConsentCookieMock.writePendingSignupConsent,
    ).toHaveBeenCalledWith(PENDING);
    expect(fetchMeOnServer).not.toHaveBeenCalled();
    expect(tokenCookiesMock.writeBackendSessionTokens).not.toHaveBeenCalled();
  });

  it('CONSENT_REQUIRED에 대기 코드가 없으면 실패시키고 아무 쿠키도 쓰지 않는다', async () => {
    vi.mocked(startSocialAuthOnServer).mockResolvedValue({
      status: 'CONSENT_REQUIRED',
      ...PENDING,
      consentToken: null,
    });

    await expect(
      authenticateSocialLogin('google', 'id-token'),
    ).rejects.toThrow();
    expect(
      signupConsentCookieMock.writePendingSignupConsent,
    ).not.toHaveBeenCalled();
    expect(tokenCookiesMock.writeBackendSessionTokens).not.toHaveBeenCalled();
  });
});

describe('completeSignupConsent', () => {
  beforeEach(() => {
    signupConsentCookieMock.readPendingSignupConsent.mockResolvedValue(PENDING);
  });

  it('대기 쿠키가 없으면 완료 API를 부르지 않고 expired로 끝낸다', async () => {
    signupConsentCookieMock.readPendingSignupConsent.mockResolvedValue(null);

    await expect(completeSignupConsent({ terms: 'v1.2' })).resolves.toEqual({
      ok: false,
      code: 'expired',
    });
    expect(completeSocialAuthOnServer).not.toHaveBeenCalled();
  });

  it('성공하면 대기 코드로 완료하고 me 검증 뒤 토큰 쿠키를 쓰고 대기 쿠키를 지운다', async () => {
    identityServerMock.readAmplitudeDeviceIdOnServer.mockResolvedValue(
      'amp-device-raw',
    );
    vi.mocked(completeSocialAuthOnServer).mockResolvedValue({
      ...TOKENS,
      isNewUser: true,
    });
    vi.mocked(fetchMeOnServer).mockResolvedValue(ME);

    await expect(completeSignupConsent({ terms: 'v1.2' })).resolves.toEqual({
      ok: true,
      profile: {
        userId: 'user-1',
        nickname: '만냐',
        profileImageUrl: null,
        isNewUser: true,
      },
    });
    expect(completeSocialAuthOnServer).toHaveBeenCalledWith(
      'pending-code',
      { terms: 'v1.2' },
      'amp-device-raw',
    );
    expect(tokenCookiesMock.writeBackendSessionTokens).toHaveBeenCalledOnce();
    expect(
      signupConsentCookieMock.clearPendingSignupConsent,
    ).toHaveBeenCalledOnce();
  });

  it('401은 expired로 끝내고 대기 쿠키를 지운다', async () => {
    vi.mocked(completeSocialAuthOnServer).mockRejectedValue(
      new BackendAuthError(
        401,
        JSON.stringify({ code: 'CONSENT_TOKEN_INVALID' }),
      ),
    );

    await expect(completeSignupConsent({ terms: 'v1.2' })).resolves.toEqual({
      ok: false,
      code: 'expired',
    });
    expect(
      signupConsentCookieMock.clearPendingSignupConsent,
    ).toHaveBeenCalledOnce();
  });

  it.each(['CONSENT_VERSION_MISMATCH', 'CONSENT_REQUIRED_MISSING'])(
    '400 %s는 outdated로 끝내고 대기 쿠키를 지운다',
    async (code) => {
      vi.mocked(completeSocialAuthOnServer).mockRejectedValue(
        new BackendAuthError(400, JSON.stringify({ code })),
      );

      await expect(completeSignupConsent({ terms: 'v1.2' })).resolves.toEqual({
        ok: false,
        code: 'outdated',
      });
      expect(
        signupConsentCookieMock.clearPendingSignupConsent,
      ).toHaveBeenCalledOnce();
    },
  );

  it.each([
    new BackendAuthError(503),
    new BackendAuthError(400, JSON.stringify({ code: 'BAD_REQUEST' })),
    new TypeError('network'),
  ])('그 밖의 실패(%s)는 retryable이고 대기 쿠키를 유지한다', async (error) => {
    vi.mocked(completeSocialAuthOnServer).mockRejectedValue(error);

    await expect(completeSignupConsent({ terms: 'v1.2' })).resolves.toEqual({
      ok: false,
      code: 'retryable',
    });
    expect(
      signupConsentCookieMock.clearPendingSignupConsent,
    ).not.toHaveBeenCalled();
  });

  it('완료 뒤 me가 실패하면 토큰 쿠키를 쓰지 않고 retryable로 끝낸다', async () => {
    vi.mocked(completeSocialAuthOnServer).mockResolvedValue(TOKENS);
    vi.mocked(fetchMeOnServer).mockRejectedValue(new Error('me failed'));

    await expect(completeSignupConsent({ terms: 'v1.2' })).resolves.toEqual({
      ok: false,
      code: 'retryable',
    });
    expect(tokenCookiesMock.writeBackendSessionTokens).not.toHaveBeenCalled();
  });
});
