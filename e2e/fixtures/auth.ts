import type { Page } from '@playwright/test';

import {
  SIGNUP_CONSENT_PROVIDER_ID,
  type SignupConsentErrorCode,
} from '@/lib/auth/signup-consent';

type MemberSessionOptions = {
  /** 세션의 `user.id`다. 세션 update 요청의 `expectedUserId`도 이 값과 비교한다. */
  userId?: string;
  /** 세션의 `user.name`으로 내려가는 닉네임이다. */
  nickname?: string;
  /** 세션의 `user.image`다. null이면 프로필 이미지가 없는 회원이다. */
  profileImageUrl?: string | null;
  /**
   * 초대 코드 안내 대기의 처음 값이다. 세션 update가 `expectedUserId`를 맞춰 거짓을 보내면 이후 조회부터
   * 거짓으로 바뀐다.
   */
  inviteOnboardingPending?: boolean;
  /** 세션 update(POST) 응답 상태다. 400 이상이면 `SESSION_UPDATE_FAILED`로 실패하고 세션 값은 그대로 둔다. */
  sessionUpdateStatus?: number;
};

/**
 * NextAuth 세션 조회(/api/auth/session)를 회원 응답으로 목킹한다.
 * 실제 Google OAuth는 외부 의존이라 E2E에서 수행하지 않는다(설계 문서 테스트 절).
 * 서버(proxy)가 회원으로 판별하도록 세션 쿠키도 더미 값으로 심는다.
 */
export async function mockMemberSession(
  page: Page,
  {
    userId = 'user-1',
    nickname = '배고픈 송아지',
    profileImageUrl = null,
    inviteOnboardingPending = false,
    sessionUpdateStatus = 200,
  }: MemberSessionOptions = {},
): Promise<void> {
  let pending = inviteOnboardingPending;

  await page.context().addCookies([
    {
      name: 'authjs.session-token',
      value: 'e2e-mock-session',
      domain: 'localhost',
      path: '/',
    },
  ]);

  await page.route('**/api/auth/session', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as {
        data?: {
          inviteOnboardingPending?: boolean;
          expectedUserId?: string;
        };
      };

      if (sessionUpdateStatus >= 400) {
        await route.fulfill({
          status: sessionUpdateStatus,
          json: { code: 'SESSION_UPDATE_FAILED' },
        });

        return;
      }

      if (
        body.data?.inviteOnboardingPending === false &&
        body.data.expectedUserId === userId
      ) {
        pending = false;
      }
    }

    await route.fulfill({
      json: {
        user: { id: userId, name: nickname, image: profileImageUrl },
        expires: '2099-01-01T00:00:00.000Z',
        inviteOnboardingPending: pending,
      },
    });
  });
}

/**
 * 회원 목 뒤에 등록해 다시 게스트로 되돌린다. 파일·describe 단위 `beforeEach`가 회원을
 * 기본으로 잡은 스펙에서 게스트 시나리오만 골라낼 때 쓴다(나중에 등록한 라우트가 우선).
 */
export async function mockGuestSession(page: Page): Promise<void> {
  await page.context().clearCookies({ name: 'authjs.session-token' });
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    });
  });
}

/**
 * 가입 동의 Credentials 제출(`signIn('signup-consent')`)을 목킹한다. 성공이면 그 시점에
 * 세션을 회원으로 바꾸고, 실패면 Auth.js처럼 error·code가 실린 URL을 응답한다.
 * 소셜 로그인 버튼이 함께 동작하도록 Google·Kakao 프로바이더도 목록에 둔다.
 *
 * @param page 대상 페이지
 * @param options.error 완료 실패 code(없으면 성공)
 * @returns 제출 본문 목록
 */
export async function mockSignupConsentSignIn(
  page: Page,
  { error }: { error?: SignupConsentErrorCode } = {},
): Promise<{ bodies: URLSearchParams[] }> {
  const state = { bodies: [] as URLSearchParams[] };

  await page.route('**/api/auth/providers', (route) =>
    route.fulfill({
      json: {
        google: { id: 'google', name: 'Google', type: 'oidc' },
        kakao: { id: 'kakao', name: 'Kakao', type: 'oidc' },
        [SIGNUP_CONSENT_PROVIDER_ID]: {
          id: SIGNUP_CONSENT_PROVIDER_ID,
          name: 'Credentials',
          type: 'credentials',
        },
      },
    }),
  );
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'test-csrf' } }),
  );
  await page.route(
    `**/api/auth/callback/${SIGNUP_CONSENT_PROVIDER_ID}*`,
    async (route) => {
      state.bodies.push(new URLSearchParams(route.request().postData() ?? ''));

      const { origin } = new URL(route.request().url());

      if (error) {
        await route.fulfill({
          json: {
            url: `${origin}/api/auth/error?error=CredentialsSignin&code=${error}`,
          },
        });

        return;
      }

      await mockMemberSession(page);
      await route.fulfill({ json: { url: `${origin}/` } });
    },
  );

  return state;
}
