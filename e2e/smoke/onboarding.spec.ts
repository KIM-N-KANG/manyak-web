import { expect, skipOnboarding, test } from '../fixtures/test';

test.describe('온보딩', () => {
  test('새 방문자는 첫 진입 시 온보딩 다이얼로그를 본다', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '키워드 몇 개로, 나만의 스토리 완성' }),
    ).toBeVisible();
  });

  test('온보딩을 본 사용자는 다이얼로그를 다시 보지 않는다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: '홈' }),
    ).toBeVisible();
    await expect(page.getByRole('img', { name: '마냑' })).toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });

  test('"첫 스토리 만들기"를 누르면 스토리 생성으로 이동한다', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '첫 스토리 만들기' }).click();

    await expect(page).toHaveURL(/\/stories\/new$/);
  });

  test('"나중에 하기"를 누르면 닫히고 새로고침 후에도 다시 열리지 않는다', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '나중에 하기' }).click();

    await expect(page.getByRole('alertdialog')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });

  test('Escape와 배경 클릭으로는 온보딩을 닫지 않는다', async ({ page }) => {
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
});
