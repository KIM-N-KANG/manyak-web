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

import '@/lib/auth/auth';

type TestToken = {
  userId?: string;
  nickname?: string;
  profileImageUrl?: string | null;
  inviteOnboardingPending?: boolean;
};

type JwtCallback = (args: {
  token: TestToken;
  account?: { id_token?: string | null } | null;
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
      account: { id_token: 'google-id-token' },
      trigger: 'signIn',
    });

    expect(authMocks.establishBackendSession).toHaveBeenCalledWith(
      'google-id-token',
    );
    expect(token).toEqual({
      userId: 'user-1',
      nickname: '만냐',
      profileImageUrl: null,
      inviteOnboardingPending: true,
    });
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
