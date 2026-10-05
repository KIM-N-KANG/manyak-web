import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  nextAuth: vi.fn((_config: unknown) => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  authenticateSocialLogin: vi.fn(),
  completeSignupConsent: vi.fn(),
  logoutOnServer: vi.fn(),
  readRefreshTokenCookie: vi.fn(),
  clearBackendSession: vi.fn(),
  processLinkCallback: vi.fn(),
  restoreSessionClaims: vi.fn(),
  readAuthCallbackUrl: vi.fn(),
}));

vi.mock('next-auth', () => ({
  default: authMocks.nextAuth,
  // Auth.js의 CredentialsSignin처럼 code 필드를 가진 에러다.
  CredentialsSignin: class extends Error {
    code = 'credentials';
  },
}));
vi.mock('next-auth/providers/credentials', () => ({
  default: (options: Record<string, unknown>) => ({
    type: 'credentials',
    ...options,
  }),
}));
vi.mock('next-auth/providers/google', () => ({
  default: (options: Record<string, unknown> = {}) => ({
    id: 'google',
    ...options,
  }),
}));
vi.mock('@/lib/auth/backend-client', () => ({
  logoutOnServer: authMocks.logoutOnServer,
}));
vi.mock('@/lib/auth/backend-session', () => ({
  authenticateSocialLogin: authMocks.authenticateSocialLogin,
  completeSignupConsent: authMocks.completeSignupConsent,
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
  readAuthCallbackUrl: authMocks.readAuthCallbackUrl,
}));

import '@/lib/auth/auth';

type TestToken = {
  userId?: string;
  nickname?: string;
  profileImageUrl?: string | null;
  inviteOnboardingPending?: boolean;
};

type TestAccount = { provider?: string; id_token?: string | null };

type TestUser = {
  id?: string;
  name?: string | null;
  image?: string | null;
  isNewUser?: boolean;
};

type SignInCallback = (args: {
  account?: TestAccount | null;
}) => Promise<boolean | string>;

type JwtCallback = (args: {
  token: TestToken;
  account?: TestAccount | null;
  user?: TestUser;
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
  providers: Array<{
    id: string;
    checks?: string[];
    authorize?: (credentials: Record<string, unknown>) => Promise<TestUser>;
  }>;
  callbacks: {
    signIn: SignInCallback;
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

const getSignupConsentAuthorize = () => {
  const authorize = getAuthConfig().providers.find(
    ({ id }) => id === 'signup-consent',
  )?.authorize;

  if (!authorize) {
    throw new Error('가입 동의 Credentials 프로바이더가 없습니다.');
  }

  return authorize;
};

const PROFILE = {
  userId: 'user-1',
  nickname: '만냐',
  profileImageUrl: null,
  isNewUser: true,
};

beforeEach(() => {
  authMocks.authenticateSocialLogin.mockReset();
  authMocks.completeSignupConsent.mockReset();
  authMocks.readAuthCallbackUrl.mockReset();
  authMocks.processLinkCallback.mockReset();
  authMocks.restoreSessionClaims.mockReset();
});

it.each(['google', 'link-google'])(
  '%s는 PKCE, state, nonce를 모두 검증한다',
  (provider) => {
    expect(
      getAuthConfig().providers.find(({ id }) => id === provider)?.checks,
    ).toEqual(['pkce', 'state', 'nonce']);
  },
);

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
    expect(authMocks.authenticateSocialLogin).not.toHaveBeenCalled();
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

describe('NextAuth 소셜 로그인 signIn 콜백', () => {
  it('COMPLETED면 true를 반환하고 같은 account의 jwt가 프로필 클레임을 만든다', async () => {
    authMocks.authenticateSocialLogin.mockResolvedValue({
      status: 'completed',
      profile: PROFILE,
    });

    const { signIn, jwt } = getAuthConfig().callbacks;
    const account = { provider: 'google', id_token: 'google-id-token' };

    await expect(signIn({ account })).resolves.toBe(true);
    expect(authMocks.authenticateSocialLogin).toHaveBeenCalledWith(
      'google',
      'google-id-token',
    );
    await expect(
      jwt({ token: {}, account, trigger: 'signIn' }),
    ).resolves.toEqual({
      userId: 'user-1',
      nickname: '만냐',
      profileImageUrl: null,
      inviteOnboardingPending: true,
    });
  });

  it('kakao 로그인도 provider를 그대로 소셜 인증에 전달한다', async () => {
    authMocks.authenticateSocialLogin.mockResolvedValue({
      status: 'completed',
      profile: { ...PROFILE, isNewUser: false },
    });

    const { signIn } = getAuthConfig().callbacks;

    await signIn({
      account: { provider: 'kakao', id_token: 'kakao-id-token' },
    });

    expect(authMocks.authenticateSocialLogin).toHaveBeenCalledWith(
      'kakao',
      'kakao-id-token',
    );
  });

  it('CONSENT_REQUIRED면 세션 대신 Auth.js가 기록한 callbackUrl로 보낸다', async () => {
    authMocks.authenticateSocialLogin.mockResolvedValue({
      status: 'consent-required',
    });
    authMocks.readAuthCallbackUrl.mockResolvedValue(
      'https://manyak.example/stories/s1?setting=ss2#endings',
    );

    const { signIn } = getAuthConfig().callbacks;

    await expect(
      signIn({ account: { provider: 'google', id_token: 'google-id-token' } }),
    ).resolves.toBe('https://manyak.example/stories/s1?setting=ss2#endings');
  });

  it('CONSENT_REQUIRED인데 callbackUrl 쿠키가 없으면 스토리 목록으로 보낸다', async () => {
    authMocks.authenticateSocialLogin.mockResolvedValue({
      status: 'consent-required',
    });
    authMocks.readAuthCallbackUrl.mockResolvedValue(null);

    const { signIn } = getAuthConfig().callbacks;

    await expect(
      signIn({ account: { provider: 'kakao', id_token: 'kakao-id-token' } }),
    ).resolves.toBe('/');
  });

  it('로그인 id_token이 없으면 소셜 인증 없이 실패시킨다', async () => {
    const { signIn } = getAuthConfig().callbacks;

    await expect(
      signIn({ account: { provider: 'google', id_token: null } }),
    ).rejects.toThrow('google 응답에 id_token이 없습니다.');
    expect(authMocks.authenticateSocialLogin).not.toHaveBeenCalled();
  });

  it.each(['link-google', 'signup-consent'])(
    '%s는 소셜 인증 없이 통과시킨다',
    async (provider) => {
      const { signIn } = getAuthConfig().callbacks;

      await expect(signIn({ account: { provider } })).resolves.toBe(true);
      expect(authMocks.authenticateSocialLogin).not.toHaveBeenCalled();
    },
  );

  it('signIn 콜백을 거치지 않은 로그인 account는 jwt에서 실패한다', async () => {
    const { jwt } = getAuthConfig().callbacks;

    await expect(
      jwt({
        token: {},
        account: { provider: 'google', id_token: 'google-id-token' },
        trigger: 'signIn',
      }),
    ).rejects.toThrow('로그인 프로필을 찾지 못했습니다.');
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
  });
});

describe('NextAuth 가입 동의 Credentials', () => {
  it('완료 성공이면 회원 user를 반환하고 jwt가 pending 플래그까지 만든다', async () => {
    authMocks.completeSignupConsent.mockResolvedValue({
      ok: true,
      profile: { ...PROFILE, profileImageUrl: 'https://example.com/a.png' },
    });

    const user = await getSignupConsentAuthorize()({
      terms: 'v1.2',
      privacy: 'v1.4',
      age14: '1',
    });

    expect(authMocks.completeSignupConsent).toHaveBeenCalledWith({
      terms: 'v1.2',
      privacy: 'v1.4',
      age14: '1',
    });
    expect(user).toEqual({
      id: 'user-1',
      name: '만냐',
      image: 'https://example.com/a.png',
      isNewUser: true,
    });

    const { jwt } = getAuthConfig().callbacks;

    await expect(
      jwt({
        token: {},
        user,
        account: { provider: 'signup-consent' },
        trigger: 'signIn',
      }),
    ).resolves.toEqual({
      userId: 'user-1',
      nickname: '만냐',
      profileImageUrl: 'https://example.com/a.png',
      inviteOnboardingPending: true,
    });
  });

  it('문자열이 아니거나 빈 동의 값과 알 수 없는 키는 보내지 않는다', async () => {
    authMocks.completeSignupConsent.mockResolvedValue({
      ok: true,
      profile: PROFILE,
    });

    await getSignupConsentAuthorize()({
      terms: 'v1.2',
      privacy: '',
      age14: 1,
      marketing: 'v1',
      csrfToken: 'csrf',
    });

    expect(authMocks.completeSignupConsent).toHaveBeenCalledWith({
      terms: 'v1.2',
    });
  });

  it('완료 실패 code를 CredentialsSignin.code로 던진다', async () => {
    authMocks.completeSignupConsent.mockResolvedValue({
      ok: false,
      code: 'expired',
    });

    await expect(
      getSignupConsentAuthorize()({ terms: 'v1.2' }),
    ).rejects.toMatchObject({ code: 'expired' });
  });
});

describe('NextAuth 초대 온보딩 세션', () => {
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
