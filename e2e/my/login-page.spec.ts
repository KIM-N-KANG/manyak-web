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

  test('마이의 로그인 버튼이 /login으로 이동한다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/my');
    await page.getByRole('link', { name: '로그인' }).click();

    await expect(page).toHaveURL('/login');
  });

  test('뒤로가기 버튼은 히스토리와 무관하게 마이로 이동한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    // OAuth 리다이렉트로 히스토리가 오염된 상황을 재현: 직접 /login에 진입(뒤로 갈 앱 히스토리 없음)
    await page.goto('/login');
    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();

    await expect(page).toHaveURL('/my');
  });
});
