import {
  ACCOUNT_DELETION_CONFIRMATIONS,
  ACCOUNT_DELETION_CTA_LABEL,
  ACCOUNT_DELETION_DESCRIPTION,
  ACCOUNT_DELETION_TITLE_LINES,
} from '@/features/my/account-deletion/constants';

import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';

test.describe('회원 탈퇴 페이지 (/my/account-deletion)', () => {
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

    for (const confirmation of ACCOUNT_DELETION_CONFIRMATIONS) {
      await page.getByRole('checkbox', { name: confirmation.title }).check();
    }

    await expect(submitButton).toBeEnabled();
  });
});
