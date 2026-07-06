import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';

test.describe('마이 페이지', () => {
  test('게스트는 게스트 표시와 로그인 버튼을 본다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/my');

    await expect(page.getByText('게스트')).toBeVisible();
    await expect(page.getByRole('link', { name: '로그인' })).toBeVisible();
    await expect(page.getByRole('link', { name: /피드백/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /로그아웃/ })).toBeHidden();
  });

  test('회원은 닉네임과 로그아웃 버튼을 본다', async ({ page }) => {
    await skipOnboarding(page);
    await mockMemberSession(page, { nickname: '배고픈 송아지' });
    await page.goto('/my');

    await expect(page.getByText('배고픈 송아지')).toBeVisible();
    await expect(page.getByRole('button', { name: /로그아웃/ })).toBeVisible();
    await expect(page.getByRole('link', { name: '로그인' })).toBeHidden();
  });

  test('하단 탭은 내 이야기·채팅·마이 페이지 3개다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/my');

    const nav = page.getByRole('navigation', { name: '하단 네비게이션' });

    await expect(nav.getByRole('link')).toHaveCount(3);
    await expect(nav.getByRole('link', { name: /내 이야기/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: /채팅/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: /마이 페이지/ })).toBeVisible();
  });
});
