import { expect, skipOnboarding, test } from '../fixtures/test';

test.describe('로그인 화면', () => {
  test('Google 로그인 버튼 단일 CTA를 보여준다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/login');

    await expect(
      page.getByRole('button', { name: /Google로 시작하기/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '이전 페이지로 돌아가기 버튼' }),
    ).toBeVisible();
    // 하단 탭이 없는 집중형 화면이다.
    await expect(
      page.getByRole('navigation', { name: '하단 네비게이션' }),
    ).toBeHidden();
  });

  test('마이 페이지의 로그인 버튼이 /login으로 이동한다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/my');
    await page.getByRole('link', { name: '로그인' }).click();

    await expect(page).toHaveURL('/login');
  });
});
