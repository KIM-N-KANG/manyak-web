import { expect, skipOnboarding, test } from '../fixtures/test';

test.describe('온보딩', () => {
  test('새 방문자는 첫 진입 시 온보딩 다이얼로그를 본다', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '나만의 스토리, 바로 만들어볼까요?' }),
    ).toBeVisible();
  });

  test('온보딩을 본 사용자는 다이얼로그를 다시 보지 않는다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: '스토리' }),
    ).toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });

  test('"첫 스토리 만들기"를 누르면 스토리 생성으로 이동한다', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '첫 스토리 만들기' }).click();

    await expect(page).toHaveURL(/\/stories\/new$/);
  });
});
