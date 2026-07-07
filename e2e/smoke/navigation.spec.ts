import { expect, skipOnboarding, test } from '../fixtures/test';

// 하단 탭으로 내 이야기↔채팅↔마이 페이지를 오간다(US-8-1).
// 온보딩 다이얼로그가 탭을 가리므로 스킵 상태에서 검증한다.
test('하단 탭으로 내 이야기·채팅·마이 페이지를 오간다', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/');

  const bottomNav = page.getByRole('navigation', { name: '하단 네비게이션' });

  // 시작: 내 이야기 페이지
  await expect(
    page.getByRole('heading', { level: 1, name: '내 이야기' }),
  ).toBeVisible();

  // 채팅으로 이동
  await bottomNav.getByRole('link', { name: '채팅' }).click();
  await expect(page).toHaveURL(/\/chats$/);
  await expect(
    page.getByRole('heading', { level: 1, name: '채팅' }),
  ).toBeVisible();
  await expect(bottomNav.getByRole('link', { name: '채팅' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  // 마이 페이지로 이동
  await bottomNav.getByRole('link', { name: '마이 페이지' }).click();
  await expect(page).toHaveURL(/\/my$/);
  await expect(
    page.getByRole('heading', { level: 1, name: '마이 페이지' }),
  ).toBeVisible();

  // 내 이야기로 복귀
  await bottomNav.getByRole('link', { name: '내 이야기' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { level: 1, name: '내 이야기' }),
  ).toBeVisible();
});
