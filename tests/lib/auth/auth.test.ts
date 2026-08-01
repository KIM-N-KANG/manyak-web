import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  nextAuth: vi.fn((_config: unknown) => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  establishBackendSession: vi.fn(),
  logoutOnServer: vi.fn(),
  readRefreshTokenCookie: vi.fn(),
  clearBackendSession: vi.fn(),
  processLinkCallback: vi.fn(),
  restoreSessionClaims: vi.fn(),
}));

vi.mock('next-auth', () => ({ default: authMocks.nextAuth }));
vi.mock('next-auth/providers/google', () => ({
  default: () => ({ id: 'google' }),
}));
vi.mock('@/lib/auth/backend-client', () => ({
  logoutOnServer: authMocks.logoutOnServer,
}));
vi.mock('@/lib/auth/backend-session', () => ({
  establishBackendSession: authMocks.establishBackendSession,
}));
vi.mock('@/lib/auth/token-cookie-policy', () => ({
  SESSION_COOKIE_MAX_AGE_SECONDS: 1_209_600,
}));
vi.mock('@/lib/auth/token-cookies', () => ({
  readRefreshTokenCookie: authMocks.readRefreshTokenCookie,
  clearBackendSession: authMocks.clearBackendSession,
}));
vi.mock('@/lib/auth/link-callback', () => ({
  processLinkCallback: authMocks.processLinkCallback,
}));
vi.mock('@/lib/auth/session-token', () => ({
  restoreSessionClaims: authMocks.restoreSessionClaims,
}));

import '@/lib/auth/auth';

type TestToken = {
  userId?: string;
  nickname?: string;
  profileImageUrl?: string | null;
  inviteOnboardingPending?: boolean;
};

type JwtCallback = (args: {
  token: TestToken;
  account?: { provider?: string; id_token?: string | null } | null;
  trigger?: 'signIn' | 'signUp' | 'update';
  session?: {
    inviteOnboardingPending?: unknown;
    expectedUserId?: unknown;
  };
}) => Promise<TestToken>;

type TestSession = {
  user: { id?: string; name?: string | null; image?: string | null };
  inviteOnboardingPending?: boolean;
};

type SessionCallback = (args: {
  session: TestSession;
  token: TestToken;
}) => TestSession;

type CapturedAuthConfig = {
  callbacks: {
    jwt: JwtCallback;
    session: SessionCallback;
  };
};

const getAuthConfig = (): CapturedAuthConfig => {
  const config = authMocks.nextAuth.mock.calls[0]?.[0];

  if (!config) {
    throw new Error('NextAuth 설정을 캡처하지 못했습니다.');
  }

  return config as unknown as CapturedAuthConfig;
};

beforeEach(() => {
  authMocks.establishBackendSession.mockReset();
  authMocks.processLinkCallback.mockReset();
  authMocks.restoreSessionClaims.mockReset();
});

describe('NextAuth 계정 연동 콜백', () => {
  it('연동 콜백은 새 토큰 대신 세션 쿠키에서 복원한 기존 클레임을 반환한다', async () => {
    // Auth.js는 OAuth 콜백에서 프로바이더 프로필로 새로 만든 토큰만 넘기므로,
    // 연동 분기는 세션 쿠키를 직접 복호화해 기존 세션을 이어가야 한다.
    authMocks.restoreSessionClaims.mockResolvedValue({
      userId: 'user-1',
      nickname: '만냐',
    });

    const { jwt } = getAuthConfig().callbacks;
    const token = await jwt({
      token: { nickname: '카카오프로필' },
      account: { provider: 'link-kakao', id_token: 'kakao-id-token' },
      trigger: 'signIn',
    });

    expect(authMocks.processLinkCallback).toHaveBeenCalledWith(
      'kakao',
      'kakao-id-token',
    );
    // 연동은 새 세션을 만들지 않는다(스펙 §4-5) — 로그인 경로를 타지 않고
    // 복원한 기존 클레임을 그대로 유지한다.
    expect(authMocks.establishBackendSession).not.toHaveBeenCalled();
    expect(token).toEqual({ userId: 'user-1', nickname: '만냐' });
  });

  it('복원된 세션이 없으면 연동 콜백은 로그인 자체를 실패시킨다', async () => {
    authMocks.restoreSessionClaims.mockResolvedValue(null);

    const { jwt } = getAuthConfig().callbacks;

    await expect(
      jwt({
        token: {},
        account: { provider: 'link-google', id_token: 'google-id-token' },
        trigger: 'signIn',
      }),
    ).rejects.toThrow('연동은 로그인된 세션에서만 진행할 수 있습니다.');
    expect(authMocks.processLinkCallback).not.toHaveBeenCalled();
  });

  it('연동 콜백에 id_token이 없으면 실패시킨다', async () => {
    authMocks.restoreSessionClaims.mockResolvedValue({ userId: 'user-1' });

    const { jwt } = getAuthConfig().callbacks;

    await expect(
      jwt({
        token: {},
        account: { provider: 'link-google', id_token: null },
        trigger: 'signIn',
      }),
    ).rejects.toThrow('link-google 응답에 id_token이 없습니다.');
    expect(authMocks.processLinkCallback).not.toHaveBeenCalled();
  });
});

describe('NextAuth 초대 온보딩 세션', () => {
  it('최초 로그인에서 백엔드 newUser를 JWT pending 플래그로 저장한다', async () => {
    authMocks.establishBackendSession.mockResolvedValue({
      userId: 'user-1',
      nickname: '만냐',
      profileImageUrl: null,
      isNewUser: true,
    });

    const { jwt } = getAuthConfig().callbacks;

    const token = await jwt({
      token: {},
      account: { provider: 'google', id_token: 'google-id-token' },
      trigger: 'signIn',
    });

    expect(authMocks.establishBackendSession).toHaveBeenCalledWith(
      'google',
      'google-id-token',
    );
    expect(token).toEqual({
      userId: 'user-1',
      nickname: '만냐',
      profileImageUrl: null,
      inviteOnboardingPending: true,
    });
  });

  it('kakao 로그인도 provider를 그대로 백엔드 세션 수립에 전달한다', async () => {
    authMocks.establishBackendSession.mockResolvedValue({
      userId: 'user-2',
      nickname: '만냐',
      profileImageUrl: null,
      isNewUser: false,
    });

    const { jwt } = getAuthConfig().callbacks;

    await jwt({
      token: {},
      account: { provider: 'kakao', id_token: 'kakao-id-token' },
      trigger: 'signIn',
    });

    expect(authMocks.establishBackendSession).toHaveBeenCalledWith(
      'kakao',
      'kakao-id-token',
    );
  });

  it('지원하지 않는 provider는 로그인 자체를 실패시킨다', async () => {
    const { jwt } = getAuthConfig().callbacks;

    await expect(
      jwt({
        token: {},
        account: { provider: 'apple', id_token: 'apple-id-token' },
        trigger: 'signIn',
      }),
    ).rejects.toThrow('지원하지 않는 로그인 provider입니다: apple');
    expect(authMocks.establishBackendSession).not.toHaveBeenCalled();
  });

  it('세션 update는 pending=false만 허용한다', async () => {
    const { jwt } = getAuthConfig().callbacks;

    await expect(
      jwt({
        token: { userId: 'user-1', inviteOnboardingPending: true },
        trigger: 'update',
        session: {
          inviteOnboardingPending: false,
          expectedUserId: 'user-1',
        },
      }),
    ).resolves.toEqual({
      userId: 'user-1',
      inviteOnboardingPending: false,
    });

    await expect(
      jwt({
        token: { userId: 'user-1', inviteOnboardingPending: false },
        trigger: 'update',
        session: {
          inviteOnboardingPending: true,
          expectedUserId: 'user-1',
        },
      }),
    ).resolves.toEqual({
      userId: 'user-1',
      inviteOnboardingPending: false,
    });
  });

  it('세션 update의 사용자가 현재 JWT 사용자와 다르면 pending을 소비하지 않는다', async () => {
    const { jwt } = getAuthConfig().callbacks;

    await expect(
      jwt({
        token: { userId: 'user-2', inviteOnboardingPending: true },
        trigger: 'update',
        session: {
          inviteOnboardingPending: false,
          expectedUserId: 'user-1',
        },
      }),
    ).resolves.toEqual({
      userId: 'user-2',
      inviteOnboardingPending: true,
    });
  });

  it('JWT 값이 정확히 true일 때만 클라이언트 세션을 pending으로 노출한다', () => {
    const { session } = getAuthConfig().callbacks;

    expect(
      session({
        session: { user: {} },
        token: { inviteOnboardingPending: true },
      }).inviteOnboardingPending,
    ).toBe(true);
    expect(
      session({
        session: { user: {} },
        token: { inviteOnboardingPending: undefined },
      }).inviteOnboardingPending,
    ).toBe(false);
  });
});
