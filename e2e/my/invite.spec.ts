import type { Page } from '@playwright/test';

import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';

const INVITE_CODE = 'CW6VZX7D';
const INVITE_URL = `https://manyak.app/invite/${INVITE_CODE}`;

/** 내 초대 코드·링크 조회 API를 고정 응답으로 목킹한다. */
async function mockMyInvite(page: Page): Promise<void> {
  await page.route('**/api/v1/users/me/invite', (route) =>
    route.fulfill({
      json: { inviteCode: INVITE_CODE, inviteUrl: INVITE_URL },
    }),
  );
}

/**
 * 카카오 JS SDK CDN 요청을 window.Kakao를 정의하는 스텁으로 대체한다.
 * 실제 SDK·네트워크 없이 로드 콜백(onReady) 배선을 결정적으로 검증하기 위함이다.
 */
async function mockKakaoSdk(page: Page): Promise<void> {
  await page.route('**/kakao_js_sdk/**', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.Kakao = (function () {
        var initialized = false;
        return {
          isInitialized: function () { return initialized; },
          init: function () { initialized = true; },
          Share: { sendDefault: function () {} },
        };
      })();`,
    }),
  );
}

test.describe('초대 링크 진입 (/invite/[code])', () => {
  test('게스트는 초대 코드가 쿠키에 저장되고 로그인 페이지로 이동한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto(`/invite/${INVITE_CODE}`);

    await expect(page).toHaveURL(/\/login$/);

    const cookies = await page.context().cookies();
    const inviteCookie = cookies.find((c) => c.name === 'manyak_invite_code');

    expect(inviteCookie?.value).toBe(INVITE_CODE);
    expect(inviteCookie?.httpOnly).toBe(true);
  });
});

test.describe('친구 초대 페이지 (/my/invite)', () => {
  test('게스트는 로그인 페이지로 이동한다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/my/invite');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('회원은 초대 코드·공유·복사 버튼·이용 안내를 본다', async ({ page }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
    await mockMyInvite(page);
    await page.goto('/my/invite');

    await expect(page.getByText('내 초대 코드')).toBeVisible();
    await expect(page.getByText(INVITE_CODE)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /카카오톡 공유/ }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /링크 복사/ })).toBeVisible();
    await expect(page.getByText('이용 안내')).toBeVisible();
  });

  test('링크 복사 버튼을 누르면 초대 링크가 클립보드에 복사되고 토스트가 뜬다', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await skipOnboarding(page);
    await mockMemberSession(page);
    await mockMyInvite(page);
    await page.goto('/my/invite');

    const copyButton = page.getByRole('button', { name: /링크 복사/ });

    await expect(copyButton).toBeEnabled();
    await copyButton.click();

    await expect(page.getByText('초대 링크를 복사했어요')).toBeVisible();

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );

    expect(clipboardText).toBe(INVITE_URL);
  });

  test('마이 페이지의 친구 초대 메뉴가 초대 페이지로 연결된다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
    await mockMyInvite(page);
    await page.goto('/my');

    await page.getByRole('link', { name: /친구 초대/ }).click();

    await expect(page).toHaveURL(/\/my\/invite$/);
    await expect(page.getByText('내 초대 코드')).toBeVisible();
  });

  test('앱 내에서 재진입해도 카카오톡 공유 버튼이 계속 활성 상태다', async ({
    page,
  }) => {
    // SDK 스크립트가 캐시된 뒤 클라이언트 라우팅으로 재진입할 때, 준비 상태 배선이
    // onLoad(최초 1회)면 버튼이 비활성으로 남는다. onReady(마운트마다)면 계속 활성이다.
    await skipOnboarding(page);
    await mockMemberSession(page);
    await mockMyInvite(page);
    await mockKakaoSdk(page);
    await page.goto('/my');

    const kakaoButton = page.getByRole('button', { name: /카카오톡 공유/ });

    // 첫 진입 — SDK 로드 후 활성화된다.
    await page.getByRole('link', { name: /친구 초대/ }).click();
    await expect(kakaoButton).toBeEnabled();

    // 뒤로 갔다가 재진입 — 스크립트는 이미 캐시된 상태다.
    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();
    await expect(page).toHaveURL(/\/my$/);
    await page.getByRole('link', { name: /친구 초대/ }).click();

    await expect(page).toHaveURL(/\/my\/invite$/);
    await expect(kakaoButton).toBeEnabled();
  });
});
