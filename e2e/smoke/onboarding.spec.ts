import { expect, test } from '@playwright/test';

// 빈 localStorage(스토리 0·채팅 0·온보딩 미열람) → 새 방문자로 간주되어 다이얼로그가 뜬다(US-2-5).
test('새 방문자는 첫 진입 시 온보딩 다이얼로그를 본다', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '나만의 스토리, 바로 만들어볼까요?' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '첫 스토리 만들기' }),
  ).toBeVisible();
});
