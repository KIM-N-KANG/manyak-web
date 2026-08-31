import type { Page } from '@playwright/test';

import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  ACCOUNT_DELETION_CONFIRMATIONS,
  ACCOUNT_DELETION_CTA_LABEL,
  ACCOUNT_DELETION_DESCRIPTION,
  ACCOUNT_DELETION_PENDING_LABEL,
  ACCOUNT_DELETION_TITLE_LINES,
} from '@/features/my/account-deletion/constants';

import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';

test.describe('회원 탈퇴 페이지 (/my/account-deletion)', () => {
  const checkAllConfirmations = async (page: Page) => {
    for (const confirmation of ACCOUNT_DELETION_CONFIRMATIONS) {
      await page.getByRole('checkbox', { name: confirmation.title }).check();
    }
  };

  test('게스트는 로그인 페이지로 이동한다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/my/account-deletion');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('회원은 마이의 회원 탈퇴 메뉴로 확인 페이지에 진입한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
    await page.goto('/my');

    await page.getByRole('link', { name: /회원 탈퇴/ }).click();

    await expect(page).toHaveURL('/my/account-deletion');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: ACCOUNT_DELETION_TITLE_LINES.join(' '),
      }),
    ).toBeVisible();
    await expect(
      page.getByText(ACCOUNT_DELETION_DESCRIPTION, { exact: true }),
    ).toBeVisible();
  });

  test('모든 확인 항목을 체크해야 회원 탈퇴하기 버튼이 활성화된다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
    await page.goto('/my/account-deletion');

    const submitButton = page.getByRole('button', {
      name: ACCOUNT_DELETION_CTA_LABEL,
    });

    await expect(submitButton).toBeDisabled();

    await checkAllConfirmations(page);

    await expect(submitButton).toBeEnabled();
  });

  test('회원 탈퇴 API 성공 후 로그아웃하고 마이 페이지로 이동한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);

    let withdrawalRequestCount = 0;
    let signOutRequestCount = 0;
    let releaseWithdrawalResponse!: () => void;
    const withdrawalResponseGate = new Promise<void>((resolve) => {
      releaseWithdrawalResponse = resolve;
    });

    await page.route('**/api/v1/users/me', async (route) => {
      withdrawalRequestCount += 1;
      expect(route.request().method()).toBe('DELETE');
      await withdrawalResponseGate;
      await route.fulfill({ status: 204, body: '' });
    });
    await page.route('**/api/auth/csrf', (route) =>
      route.fulfill({ json: { csrfToken: 'test-csrf' } }),
    );
    await page.route('**/api/auth/signout', (route) => {
      signOutRequestCount += 1;

      const body = new URLSearchParams(route.request().postData() ?? '');

      return route.fulfill({
        json: { url: body.get('callbackUrl') ?? '/my' },
      });
    });

    await page.goto('/my/account-deletion');
    await checkAllConfirmations(page);
    await page
      .getByRole('button', { name: ACCOUNT_DELETION_CTA_LABEL })
      .click();

    await expect(page.getByLabel(ACCOUNT_DELETION_PENDING_LABEL)).toBeVisible();
    await expect(
      page.getByLabel(ACCOUNT_DELETION_PENDING_LABEL).locator('xpath=..'),
    ).toBeDisabled();

    releaseWithdrawalResponse();
    await page.waitForURL('**/my');
    expect(withdrawalRequestCount).toBe(1);
    expect(signOutRequestCount).toBe(1);
  });

  test('회원 탈퇴 API 실패 시 페이지에 남아 다시 시도할 수 있다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
    await page.route('**/api/v1/users/me', (route) =>
      route.fulfill({ status: 500, json: { code: 'SERVER_ERROR' } }),
    );

    await page.goto('/my/account-deletion');
    await checkAllConfirmations(page);

    const submitButton = page.getByRole('button', {
      name: ACCOUNT_DELETION_CTA_LABEL,
    });

    await submitButton.click();

    await expect(page).toHaveURL('/my/account-deletion');
    await expect(
      page.getByText(TOAST_MESSAGE.ACCOUNT_DELETION_FAILED),
    ).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });
});
