import type { Page } from '@playwright/test';

type MemberSessionOptions = {
  userId?: string;
  nickname?: string;
  profileImageUrl?: string | null;
  inviteOnboardingPending?: boolean;
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
