import type { Page } from '@playwright/test';

import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';

const INVITE_CODE = 'CW6VZX7D';
const INVITE_API = '**/api/v1/users/me/invite';
const REDEEM_API = '**/api/v1/users/me/invite/redeem';

async function mockMyInvite(
  page: Page,
  body: Record<string, unknown> = {
    inviteCode: INVITE_CODE,
    monthlyRewardCount: 3,
    monthlyRewardLimit: 10,
  },
): Promise<void> {
  await page.route(INVITE_API, (route) => route.fulfill({ json: body }));
}

async function prepareMemberInvitePage(page: Page): Promise<void> {
  await skipOnboarding(page);
  await mockMemberSession(page);
  await mockMyInvite(page);
}

async function mockKakaoSdk(page: Page): Promise<void> {
  await page.route('**/kakao_js_sdk/**', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.Kakao = (function () {
        var initialized = false;
        return {
          isInitialized: function () { return initialized; },
          init: function () { initialized = true; },
          Share: {
            sendDefault: function (settings) {
              window.__kakaoShareSettings = settings;
            },
          },
        };
      })();`,
    }),
  );
}

test.describe('폐기된 초대 링크', () => {
  test('/invite/[code]는 쿠키나 로그인 리다이렉트 없이 404를 반환한다', async ({
    page,
  }) => {
    const response = await page.goto(`/invite/${INVITE_CODE}`);

    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(`/invite/${INVITE_CODE}`);

    const cookies = await page.context().cookies();

    expect(cookies.some((cookie) => cookie.name === 'manyak_invite_code')).toBe(
      false,
    );
  });
});

test.describe('친구 초대 페이지 (/more/invite)', () => {
  test('게스트는 로그인 페이지로 이동한다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/more/invite');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('회원은 초대 코드·월 진행·공유 버튼·코드 입력 폼을 본다', async ({
    page,
  }) => {
    await prepareMemberInvitePage(page);
    await page.goto('/more/invite');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      '친구를 초대하고',
    );
    await expect(page.getByText('내 초대 코드', { exact: true })).toBeVisible();
    await expect(page.getByText(INVITE_CODE)).toBeVisible();
    await expect(page.getByText('이번 달 받은 보상 3/10회')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '코드 복사하기' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '카카오톡 공유하기' }),
    ).toBeVisible();
    await expect(page.getByLabel('초대 코드', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: '등록', exact: true }),
    ).toBeVisible();
  });

  test('세션 갱신 뒤에도 페이지 조회 이벤트는 사용자당 한 번만 전송한다', async ({
    page,
  }) => {
    const viewedEvents: string[] = [];

    page.on('console', (message) => {
      if (message.text().includes('client_invite_viewed')) {
        viewedEvents.push(message.text());
      }
    });
    await skipOnboarding(page);
    await mockMemberSession(page, { inviteOnboardingPending: true });
    await mockMyInvite(page);
    await page.goto('/more/invite');

    await expect(page.getByRole('dialog')).toBeVisible();

    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/session') &&
        response.request().method() === 'POST',
    );

    await page.keyboard.press('Escape');
    await updateResponse;
    await page.waitForTimeout(200);

    expect(viewedEvents).toHaveLength(1);
  });

  test('코드 복사 버튼은 초대 코드만 복사하고 성공 토스트를 띄운다', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await prepareMemberInvitePage(page);
    await page.goto('/more/invite');

    await page.getByRole('button', { name: '코드 복사하기' }).click();

    await expect(page.getByText('초대 코드를 복사했어요')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(INVITE_CODE);
  });

  test('카카오 공유는 코드·확정 문구·홈 링크를 전송한다', async ({ page }) => {
    await prepareMemberInvitePage(page);
    await mockKakaoSdk(page);
    await page.goto('/more/invite');

    const shareButton = page.getByRole('button', {
      name: '카카오톡 공유하기',
    });

    await expect(shareButton).toBeEnabled();
    await shareButton.click();

    const settings = await page.evaluate(
      () =>
        (
          window as typeof window & {
            __kakaoShareSettings?: {
              content: {
                title: string;
                description: string;
                link: { mobileWebUrl: string; webUrl: string };
              };
              buttons: Array<{
                title: string;
                link: { mobileWebUrl: string; webUrl: string };
              }>;
            };
          }
        ).__kakaoShareSettings,
    );
    const homeUrl = new URL('/', page.url()).toString();

    expect(settings?.content.title).toBe(
      '초대 코드 등록하고 500 크레딧 받기 🎁',
    );
    expect(settings?.content.description).toBe(`초대 코드: ${INVITE_CODE}`);
    expect(settings?.content.link).toEqual({
      mobileWebUrl: homeUrl,
      webUrl: homeUrl,
    });
    expect(settings?.buttons).toEqual([
      {
        title: '마냑 하러가기',
        link: { mobileWebUrl: homeUrl, webUrl: homeUrl },
      },
    ]);
  });

  test('초대자 월 보상 상한에 도달해도 코드 복사와 공유를 허용한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
    await mockMyInvite(page, {
      inviteCode: INVITE_CODE,
      monthlyRewardCount: 10,
      monthlyRewardLimit: 10,
    });
    await mockKakaoSdk(page);
    await page.goto('/more/invite');

    await expect(page.getByText('이번 달 받은 보상 10/10회')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '코드 복사하기' }),
    ).toBeEnabled();
    await expect(
      page.getByRole('button', { name: '카카오톡 공유하기' }),
    ).toBeEnabled();
  });

  test('입력 코드를 정규화해 제출하고 500 크레딧 성공을 안내한다', async ({
    page,
  }) => {
    await prepareMemberInvitePage(page);

    let requestBody: unknown;

    await page.route(REDEEM_API, async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({ json: { amount: 500, balance: 1_000 } });
    });
    await page.goto('/more/invite');

    await page.getByLabel('초대 코드', { exact: true }).fill('cw6vzx7d');
    await page.getByRole('button', { name: '등록', exact: true }).click();

    await expect(
      page.getByText('친구 초대 보상으로 500 크레딧을 받았어요'),
    ).toBeVisible();
    expect(requestBody).toEqual({ code: INVITE_CODE });
  });

  test('코드 등록 중 버튼 크기를 유지한 채 스피너를 표시한다', async ({
    page,
  }) => {
    await prepareMemberInvitePage(page);

    let markRequestReceived = () => {};
    let releaseRedeem = () => {};
    const requestReceived = new Promise<void>((resolve) => {
      markRequestReceived = resolve;
    });
    const redeemReleased = new Promise<void>((resolve) => {
      releaseRedeem = resolve;
    });

    await page.route(REDEEM_API, async (route) => {
      markRequestReceived();
      await redeemReleased;
      await route.fulfill({ json: { amount: 500, balance: 1_000 } });
    });
    await page.goto('/more/invite');

    await page.getByLabel('초대 코드', { exact: true }).fill('friend1');

    const submitButton = page.getByRole('button', {
      name: '등록',
      exact: true,
    });
    const initialWidth = await submitButton.evaluate(
      (button) => (button as HTMLElement).offsetWidth,
    );

    await submitButton.click();
    await requestReceived;

    try {
      const loadingSpinner = page.getByLabel('초대 코드 등록 중');
      const loadingButton = loadingSpinner.locator('xpath=ancestor::button');

      await expect(loadingSpinner).toBeVisible();
      await expect(loadingButton).toBeDisabled();
      expect(
        await loadingButton.evaluate(
          (button) => (button as HTMLElement).offsetWidth,
        ),
      ).toBe(initialWidth);
    } finally {
      releaseRedeem();
    }
  });

  test('빈 코드는 API를 호출하지 않고 인라인 오류를 표시한다', async ({
    page,
  }) => {
    await prepareMemberInvitePage(page);

    let requestCount = 0;

    await page.route(REDEEM_API, async (route) => {
      requestCount += 1;
      await route.fulfill({ json: { amount: 500, balance: 1_000 } });
    });
    await page.goto('/more/invite');

    await page.getByRole('button', { name: '등록', exact: true }).click();

    await expect(
      page.locator('[data-slot="field-error"][role="alert"]'),
    ).toHaveText('코드를 입력해주세요');
    await expect(page.getByLabel('초대 코드', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(requestCount).toBe(0);
  });

  test('코드 조회 실패 후 재시도할 수 있고 입력 폼은 계속 사용할 수 있다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);

    let requestCount = 0;

    await page.route(INVITE_API, async (route) => {
      requestCount += 1;

      if (requestCount === 1) {
        await route.fulfill({ status: 500, json: { code: 'SERVER_ERROR' } });

        return;
      }

      await route.fulfill({
        json: {
          inviteCode: INVITE_CODE,
          monthlyRewardCount: 3,
          monthlyRewardLimit: 10,
        },
      });
    });
    await page.goto('/more/invite');

    await expect(page.getByText('초대 코드를 불러오지 못했어요')).toBeVisible();
    await expect(page.getByLabel('초대 코드', { exact: true })).toBeEnabled();
    await page.getByRole('button', { name: '다시 시도하기' }).click();

    await expect(page.getByText(INVITE_CODE)).toBeVisible();
    expect(requestCount).toBe(2);
  });

  test('캐시된 코드의 백그라운드 재조회가 실패해도 기존 코드와 공유 액션을 유지한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
    await mockKakaoSdk(page);

    let requestCount = 0;
    let shouldFail = false;

    await page.route(INVITE_API, async (route) => {
      requestCount += 1;

      if (!shouldFail) {
        await route.fulfill({
          json: {
            inviteCode: INVITE_CODE,
            monthlyRewardCount: 3,
            monthlyRewardLimit: 10,
          },
        });

        return;
      }

      await route.fulfill({ status: 500, json: { code: 'SERVER_ERROR' } });
    });
    await page.goto('/more');
    await page.getByRole('link', { name: /친구 초대/ }).click();
    await expect(page.getByText(INVITE_CODE)).toBeVisible();

    const successfulRequestCount = requestCount;

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();
    shouldFail = true;
    await page.getByRole('link', { name: /친구 초대/ }).click();

    await expect
      .poll(() => requestCount)
      .toBeGreaterThan(successfulRequestCount);
    await expect(page.getByText(INVITE_CODE)).toBeVisible();
    await expect(
      page.getByRole('button', { name: '코드 복사하기' }),
    ).toBeEnabled();
    await expect(
      page.getByRole('button', { name: '카카오톡 공유하기' }),
    ).toBeEnabled();
    await expect(page.getByText('초대 코드를 불러오지 못했어요')).toHaveCount(
      0,
    );
  });

  test('조회 응답에 코드가 없어도 실패 안내와 입력 폼을 표시한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
    await mockMyInvite(page, {
      monthlyRewardCount: 3,
      monthlyRewardLimit: 10,
    });
    await page.goto('/more/invite');

    await expect(page.getByText('초대 코드를 불러오지 못했어요')).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole('button', { name: '다시 시도하기' }),
    ).toBeVisible();
    await expect(page.getByLabel('초대 코드', { exact: true })).toBeEnabled();
  });

  const errorCases = [
    {
      status: 404,
      code: 'NOT_FOUND',
      message: '코드를 다시 확인해주세요',
    },
    {
      status: 409,
      code: 'INVITE_SELF_CODE',
      message: '내 코드는 입력할 수 없어요',
    },
    {
      status: 409,
      code: 'INVITE_ALREADY_REDEEMED',
      message: '이미 초대 코드를 입력했어요',
    },
    {
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '초대 코드 입력에 실패했어요',
    },
  ] as const;

  for (const { status, code, message } of errorCases) {
    test(`${status} ${code} 응답을 알맞게 안내한다`, async ({ page }) => {
      await prepareMemberInvitePage(page);
      await page.route(REDEEM_API, (route) =>
        route.fulfill({ status, json: { code } }),
      );
      await page.goto('/more/invite');

      await page.getByLabel('초대 코드', { exact: true }).fill('friend1');
      await page.getByRole('button', { name: '등록', exact: true }).click();

      await expect(
        page.locator('[data-slot="field-error"][role="alert"]'),
      ).toHaveText(message);
      await expect(page.getByLabel('초대 코드', { exact: true })).toHaveValue(
        'FRIEND1',
      );
    });
  }

  test('더보기의 친구 초대 메뉴가 초대 페이지로 연결된다', async ({ page }) => {
    await prepareMemberInvitePage(page);
    await page.goto('/more');

    await page.getByRole('link', { name: /친구 초대/ }).click();

    await expect(page).toHaveURL(/\/more\/invite$/);
    await expect(page.getByText('내 초대 코드', { exact: true })).toBeVisible();
  });

  test('앱 내에서 재진입해도 카카오톡 공유 버튼이 활성 상태다', async ({
    page,
  }) => {
    await prepareMemberInvitePage(page);
    await mockKakaoSdk(page);
    await page.goto('/more');

    const kakaoButton = page.getByRole('button', {
      name: '카카오톡 공유하기',
    });

    await page.getByRole('link', { name: /친구 초대/ }).click();
    await expect(kakaoButton).toBeEnabled();

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();
    await expect(page).toHaveURL(/\/more$/);
    await page.getByRole('link', { name: /친구 초대/ }).click();

    await expect(page).toHaveURL(/\/more\/invite$/);
    await expect(kakaoButton).toBeEnabled();
  });
});

test.describe('신규 가입 초대 코드 다이얼로그', () => {
  async function preparePendingMember(page: Page): Promise<void> {
    await skipOnboarding(page);
    await mockMemberSession(page, { inviteOnboardingPending: true });
  }

  test('신규 회원에게만 초대 코드 다이얼로그를 표시하고 입력에 초점을 둔다', async ({
    page,
  }) => {
    await mockMemberSession(page, { inviteOnboardingPending: true });
    await page.goto('/');

    const dialog = page.getByRole('dialog');

    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: '초대 코드가 있나요?' }),
    ).toBeVisible();
    await expect(dialog).toContainText(
      '친구에게 받은 초대 코드를 등록하면 500 크레딧을 받을 수 있어요',
    );
    await expect(dialog.getByLabel('초대 코드', { exact: true })).toBeFocused();

    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/\/$/);
  });

  test('Escape로 닫으면 세션 플래그를 소비해 새로고침 후에도 닫혀 있다', async ({
    page,
  }) => {
    await preparePendingMember(page);
    await page.goto('/');

    await expect(page.getByRole('dialog')).toBeVisible();

    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/session') &&
        response.request().method() === 'POST',
    );

    await page.keyboard.press('Escape');

    const response = await updateResponse;

    expect(response.request().postDataJSON()).toMatchObject({
      data: {
        inviteOnboardingPending: false,
        expectedUserId: 'user-1',
      },
    });
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('세션 상태 저장에 실패하면 다이얼로그를 유지하고 재시도를 안내한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page, {
      inviteOnboardingPending: true,
      sessionUpdateStatus: 500,
    });
    await page.goto('/');

    await expect(page.getByRole('dialog')).toBeVisible();

    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/session') &&
        response.request().method() === 'POST',
    );

    await page.keyboard.press('Escape');
    await updateResponse;

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('창을 닫지 못했어요')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('코드 적립 후 세션 저장에 실패하면 코드를 다시 받지 않고 상태 저장 재시도를 제공한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page, {
      inviteOnboardingPending: true,
      sessionUpdateStatus: 500,
    });
    await page.route(REDEEM_API, (route) =>
      route.fulfill({ json: { amount: 500, balance: 1_000 } }),
    );
    await page.goto('/');

    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/session') &&
        response.request().method() === 'POST',
    );

    await page.getByLabel('초대 코드', { exact: true }).fill('friend1');
    await page.getByRole('button', { name: '등록하기' }).click();
    await updateResponse;

    await expect(
      page.getByText('친구 초대 보상으로 500 크레딧을 받았어요'),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('초대 코드', { exact: true })).toHaveCount(0);
    await expect(
      page.getByText('500 크레딧은 정상 지급되었지만, 창을 닫는 데 실패했어요'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '닫기' })).toBeVisible();
    await expect(page.getByText('창을 닫지 못했어요')).toHaveCount(0);
  });

  test('열려 있던 게스트 온보딩은 인증 전환 시 닫혀 초대 다이얼로그와 겹치지 않는다', async ({
    page,
  }) => {
    let isAuthenticated = false;

    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        json: isAuthenticated
          ? {
              user: { id: 'user-1', name: '배고픈 송아지', image: null },
              expires: '2099-01-01T00:00:00.000Z',
              inviteOnboardingPending: true,
            }
          : null,
      }),
    );
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        name: '키워드 몇 개로, 나만의 스토리 완성',
      }),
    ).toBeVisible();

    isAuthenticated = true;
    await page.evaluate(() => {
      const channel = new BroadcastChannel('next-auth');

      channel.postMessage({
        event: 'session',
        data: { trigger: 'getSession' },
      });
      channel.close();
    });

    await expect(
      page.getByRole('heading', { name: '초대 코드가 있나요?' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: '키워드 몇 개로, 나만의 스토리 완성',
      }),
    ).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(1);
  });

  test('코드 입력 성공 시 다이얼로그를 닫고 새로고침 후에도 다시 열지 않는다', async ({
    page,
  }) => {
    await preparePendingMember(page);
    await page.route(REDEEM_API, (route) =>
      route.fulfill({ json: { amount: 500, balance: 1_000 } }),
    );
    await page.goto('/');

    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/session') &&
        response.request().method() === 'POST',
    );

    await page.getByLabel('초대 코드', { exact: true }).fill('friend1');
    await page.getByRole('button', { name: '등록하기' }).click();
    await updateResponse;

    await expect(
      page.getByText('친구 초대 보상으로 500 크레딧을 받았어요'),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('코드 적립 후 세션 저장이 끝날 때까지 폼과 등록 스피너를 유지하고 실패 안내를 보이지 않는다', async ({
    page,
  }) => {
    await skipOnboarding(page);

    let pending = true;
    let markUpdateReceived = () => {};
    let releaseUpdate = () => {};
    const updateReceived = new Promise<void>((resolve) => {
      markUpdateReceived = resolve;
    });
    const updateReleased = new Promise<void>((resolve) => {
      releaseUpdate = resolve;
    });

    await page.route('**/api/auth/session', async (route) => {
      if (route.request().method() === 'POST') {
        markUpdateReceived();
        await updateReleased;
        pending = false;
      }

      await route.fulfill({
        json: {
          user: { id: 'user-1', name: '배고픈 송아지', image: null },
          expires: '2099-01-01T00:00:00.000Z',
          inviteOnboardingPending: pending,
        },
      });
    });
    await page.route(REDEEM_API, (route) =>
      route.fulfill({ json: { amount: 500, balance: 1_000 } }),
    );
    await page.goto('/');

    await page.getByLabel('초대 코드', { exact: true }).fill('friend1');
    await page.getByRole('button', { name: '등록하기' }).click();
    await updateReceived;

    await expect(
      page.getByText('친구 초대 보상으로 500 크레딧을 받았어요'),
    ).toBeVisible();
    await expect(page.getByLabel('초대 코드', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '등록 중' })).toBeDisabled();
    await expect(
      page.getByText('500 크레딧은 정상 지급되었지만, 창을 닫는 데 실패했어요'),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: '닫기' })).toHaveCount(0);

    releaseUpdate();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('코드 제출 중에는 입력과 제출·건너뛰기를 모두 잠근다', async ({
    page,
  }) => {
    await preparePendingMember(page);

    let markRequestReceived = () => {};
    let releaseRedeem = () => {};
    const requestReceived = new Promise<void>((resolve) => {
      markRequestReceived = resolve;
    });
    const redeemReleased = new Promise<void>((resolve) => {
      releaseRedeem = resolve;
    });

    await page.route(REDEEM_API, async (route) => {
      markRequestReceived();
      await redeemReleased;
      await route.fulfill({ json: { amount: 500, balance: 1_000 } });
    });
    await page.goto('/');

    const input = page.getByLabel('초대 코드', { exact: true });
    const submitButton = page.getByRole('button', { name: '등록하기' });
    const initialWidth = await submitButton.evaluate(
      (button) => (button as HTMLElement).offsetWidth,
    );

    await input.fill('friend1');
    await submitButton.click();
    await requestReceived;

    try {
      await expect(input).toBeDisabled();

      const loadingSpinner = page.getByLabel('등록 중');
      const loadingButton = loadingSpinner.locator('xpath=ancestor::button');

      await expect(loadingButton).toBeDisabled();
      expect(
        await loadingButton.evaluate(
          (button) => (button as HTMLElement).offsetWidth,
        ),
      ).toBe(initialWidth);
      await expect(page.getByRole('dialog').locator('form')).toHaveAttribute(
        'aria-busy',
        'true',
      );
    } finally {
      releaseRedeem();
    }

    await expect(
      page.getByText('친구 초대 보상으로 500 크레딧을 받았어요'),
    ).toBeVisible();
  });

  test('배경 클릭도 Escape와 동일하게 세션 플래그를 소비한다', async ({
    page,
  }) => {
    await preparePendingMember(page);
    await page.goto('/');

    const dialog = page.getByRole('dialog');

    await expect(dialog).toBeVisible();

    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/session') &&
        response.request().method() === 'POST',
    );

    await page
      .locator('[data-slot="dialog-overlay"]')
      .click({ position: { x: 4, y: 4 } });

    const response = await updateResponse;

    expect(response.request().postDataJSON()).toMatchObject({
      data: {
        inviteOnboardingPending: false,
        expectedUserId: 'user-1',
      },
    });
    await expect(dialog).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('잘못된 입력은 다이얼로그를 유지하고 접근 가능한 오류를 표시한다', async ({
    page,
  }) => {
    await preparePendingMember(page);
    await page.route(REDEEM_API, (route) =>
      route.fulfill({ status: 409, json: { code: 'INVITE_SELF_CODE' } }),
    );
    await page.goto('/');

    const input = page.getByLabel('초대 코드', { exact: true });

    await input.fill('mycode');
    await page.getByRole('button', { name: '등록하기' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(
      page.locator('[data-slot="field-error"][role="alert"]'),
    ).toHaveText('내 코드는 입력할 수 없어요');
  });
});
