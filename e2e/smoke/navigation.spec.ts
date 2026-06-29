import { expect, skipOnboarding, test } from '../fixtures/test';

// 하단 탭으로 스토리↔채팅↔피드백을 오간다(US-8-1).
// 온보딩 다이얼로그가 탭을 가리므로 스킵 상태에서 검증한다.
test('하단 탭으로 스토리·채팅·피드백을 오간다', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/');

  const bottomNav = page.getByRole('navigation', { name: '하단 네비게이션' });

  // 시작: 스토리 페이지
  await expect(
    page.getByRole('heading', { level: 1, name: '스토리' }),
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

  // 피드백으로 이동
  await bottomNav.getByRole('link', { name: '피드백' }).click();
  await expect(page).toHaveURL(/\/feedback$/);
  await expect(
    page.getByRole('heading', { level: 1, name: '피드백' }),
  ).toBeVisible();

  // 스토리로 복귀
  await bottomNav.getByRole('link', { name: '스토리' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { level: 1, name: '스토리' }),
  ).toBeVisible();
});
