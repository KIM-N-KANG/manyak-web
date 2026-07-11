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

test.describe('친구 초대 페이지 (/my/invite)', () => {
  test('게스트는 로그인 페이지로 이동한다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/my/invite');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('회원은 초대 코드·월 진행·공유 버튼·코드 입력 폼을 본다', async ({
    page,
  }) => {
    await prepareMemberInvitePage(page);
    await page.goto('/my/invite');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      '친구를 초대하고',
    );
    await expect(page.getByText('내 초대 코드', { exact: true })).toBeVisible();
    await expect(page.getByText(INVITE_CODE)).toBeVisible();
    await expect(page.getByText('이번 달 3/10회')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '코드 복사하기' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '카카오톡 공유하기' }),
    ).toBeVisible();
    await expect(page.getByLabel('친구 초대 코드')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '500 크레딧 받기' }),
    ).toBeVisible();
  });

  test('코드 복사 버튼은 초대 코드만 복사하고 성공 토스트를 띄운다', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await prepareMemberInvitePage(page);
    await page.goto('/my/invite');

    await page.getByRole('button', { name: '코드 복사하기' }).click();

    await expect(page.getByText('초대 코드를 복사했어요')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(INVITE_CODE);
  });

  test('카카오 공유는 코드·확정 문구·홈 링크를 전송한다', async ({ page }) => {
    await prepareMemberInvitePage(page);
    await mockKakaoSdk(page);
    await page.goto('/my/invite');

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

    expect(settings?.content.title).toBe(`초대 코드 ${INVITE_CODE}`);
    expect(settings?.content.description).toBe(
      '로그인하고 코드를 입력하면 나와 친구 모두 500 크레딧을 받아요.',
    );
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
    await page.goto('/my/invite');

    await expect(page.getByText('이번 달 10/10회')).toBeVisible();
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
    await page.goto('/my/invite');

    await page.getByLabel('친구 초대 코드').fill('  cw6vzx7d  ');
    await page.getByRole('button', { name: '500 크레딧 받기' }).click();

    await expect(page.getByText('크레딧 500개를 받았어요')).toBeVisible();
    expect(requestBody).toEqual({ code: INVITE_CODE });
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
    await page.goto('/my/invite');

    await page.getByRole('button', { name: '500 크레딧 받기' }).click();

    await expect(
      page.locator('[data-slot="field-error"][role="alert"]'),
    ).toHaveText('코드를 입력해 주세요');
    await expect(page.getByLabel('친구 초대 코드')).toHaveAttribute(
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
    await page.goto('/my/invite');

    await expect(page.getByText('초대 코드를 불러오지 못했어요')).toBeVisible();
    await expect(page.getByLabel('친구 초대 코드')).toBeEnabled();
    await page.getByRole('button', { name: '다시 시도' }).click();

    await expect(page.getByText(INVITE_CODE)).toBeVisible();
    expect(requestCount).toBe(2);
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
    await page.goto('/my/invite');

    await expect(page.getByText('초대 코드를 불러오지 못했어요')).toBeVisible();
    await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
    await expect(page.getByLabel('친구 초대 코드')).toBeEnabled();
  });

  const errorCases = [
    {
      status: 404,
      code: 'NOT_FOUND',
      message: '코드를 다시 확인해 주세요',
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
      message: '초대 코드 입력에 실패했어요. 잠시 후 다시 시도해 주세요',
    },
  ] as const;

  for (const { status, code, message } of errorCases) {
    test(`${status} ${code} 응답을 알맞게 안내한다`, async ({ page }) => {
      await prepareMemberInvitePage(page);
      await page.route(REDEEM_API, (route) =>
        route.fulfill({ status, json: { code } }),
      );
      await page.goto('/my/invite');

      await page.getByLabel('친구 초대 코드').fill('friend1');
      await page.getByRole('button', { name: '500 크레딧 받기' }).click();

      await expect(
        page.locator('[data-slot="field-error"][role="alert"]'),
      ).toHaveText(message);
      await expect(page.getByLabel('친구 초대 코드')).toHaveValue('FRIEND1');
    });
  }

  test('마이의 친구 초대 메뉴가 초대 페이지로 연결된다', async ({ page }) => {
    await prepareMemberInvitePage(page);
    await page.goto('/my');

    await page.getByRole('link', { name: /친구 초대/ }).click();

    await expect(page).toHaveURL(/\/my\/invite$/);
    await expect(page.getByText('내 초대 코드', { exact: true })).toBeVisible();
  });

  test('앱 내에서 재진입해도 카카오톡 공유 버튼이 활성 상태다', async ({
    page,
  }) => {
    await prepareMemberInvitePage(page);
    await mockKakaoSdk(page);
    await page.goto('/my');

    const kakaoButton = page.getByRole('button', {
      name: '카카오톡 공유하기',
    });

    await page.getByRole('link', { name: /친구 초대/ }).click();
    await expect(kakaoButton).toBeEnabled();

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();
    await expect(page).toHaveURL(/\/my$/);
    await page.getByRole('link', { name: /친구 초대/ }).click();

    await expect(page).toHaveURL(/\/my\/invite$/);
    await expect(kakaoButton).toBeEnabled();
  });
});

test.describe('신규 가입 초대 코드 다이얼로그', () => {
  async function preparePendingMember(page: Page): Promise<void> {
    await skipOnboarding(page);
    await mockMemberSession(page, { inviteOnboardingPending: true });
  }

  test('신규 회원에게만 초대 코드 AlertDialog를 표시하고 입력에 초점을 둔다', async ({
    page,
  }) => {
    await mockMemberSession(page, { inviteOnboardingPending: true });
    await page.goto('/');

    const dialog = page.getByRole('alertdialog');

    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: '초대 코드가 있나요?' }),
    ).toBeVisible();
    await expect(dialog).toContainText(
      '친구에게 받은 초대 코드를 입력하면 나와 친구 모두 500 크레딧을 받아요.',
    );
    await expect(dialog.getByLabel('친구 초대 코드')).toBeFocused();
    await expect(
      dialog.getByRole('button', { name: '나중에 입력하기' }),
    ).toBeVisible();

    await page.waitForTimeout(400);
    await expect(
      page.getByRole('heading', {
        name: '나만의 스토리, 바로 만들어볼까요?',
      }),
    ).toHaveCount(0);
  });

  test('나중에 입력하기를 누르면 세션 플래그를 소비해 새로고침 후에도 닫혀 있다', async ({
    page,
  }) => {
    await preparePendingMember(page);
    await page.goto('/');

    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/session') &&
        response.request().method() === 'POST',
    );

    await page.getByRole('button', { name: '나중에 입력하기' }).click();

    const response = await updateResponse;

    expect(response.request().postDataJSON()).toMatchObject({
      data: { inviteOnboardingPending: false },
    });
    await expect(page.getByRole('alertdialog')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
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

    await page.getByLabel('친구 초대 코드').fill('friend1');
    await page.getByRole('button', { name: '500 크레딧 받기' }).click();
    await updateResponse;

    await expect(page.getByText('크레딧 500개를 받았어요')).toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
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

    const input = page.getByLabel('친구 초대 코드');

    await input.fill('friend1');
    await page.getByRole('button', { name: '500 크레딧 받기' }).click();
    await requestReceived;

    try {
      await expect(input).toBeDisabled();
      await expect(
        page.getByRole('button', { name: '입력 중...' }),
      ).toBeDisabled();
      await expect(
        page.getByRole('button', { name: '나중에 입력하기' }),
      ).toBeDisabled();
      await expect(
        page.getByRole('alertdialog').locator('form'),
      ).toHaveAttribute('aria-busy', 'true');
    } finally {
      releaseRedeem();
    }

    await expect(page.getByText('크레딧 500개를 받았어요')).toBeVisible();
  });

  test('Escape와 배경 클릭으로는 pending 다이얼로그를 닫지 않는다', async ({
    page,
  }) => {
    await preparePendingMember(page);
    await page.goto('/');

    const dialog = page.getByRole('alertdialog');

    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await page
      .locator('[data-slot="alert-dialog-overlay"]')
      .click({ position: { x: 4, y: 4 } });
    await expect(dialog).toBeVisible();
  });

  test('잘못된 입력은 다이얼로그를 유지하고 접근 가능한 오류를 표시한다', async ({
    page,
  }) => {
    await preparePendingMember(page);
    await page.route(REDEEM_API, (route) =>
      route.fulfill({ status: 409, json: { code: 'INVITE_SELF_CODE' } }),
    );
    await page.goto('/');

    const input = page.getByLabel('친구 초대 코드');

    await input.fill('mycode');
    await page.getByRole('button', { name: '500 크레딧 받기' }).click();

    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(
      page.locator('[data-slot="field-error"][role="alert"]'),
    ).toHaveText('내 코드는 입력할 수 없어요');
  });
});
