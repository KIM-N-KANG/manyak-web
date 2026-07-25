import { expect, skipOnboarding, test } from '../fixtures/test';

const HOME_FILLED_PATH =
  'M12.907 1.36366C12.3115 1.21521 11.6886 1.21521 11.093 1.36366';
const USER_FILLED_PATH =
  'M20 17.5C20 19.9853 20 22 12 22C4 22 4 19.9853 4 17.5';

// 하단 탭으로 홈↔채팅↔마이를 오간다(US-8-1).
// 온보딩 다이얼로그가 탭을 가리므로 스킵 상태에서 검증한다.
test('하단 탭으로 홈·채팅·마이를 오간다', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/');

  const bottomNav = page.getByRole('navigation', { name: '하단 네비게이션' });
  const homeLink = bottomNav.getByRole('link', { name: '홈' });

  // 시작: 홈 페이지
  await expect(
    page.getByRole('heading', { level: 1, name: '홈' }),
  ).toBeVisible();
  await expect(page.getByRole('img', { name: '마냑' })).toBeVisible();
  await expect(bottomNav.locator('span')).toHaveCount(0);
  await expect(homeLink).toHaveCSS('padding-top', '16px');
  await expect(homeLink).toHaveCSS('padding-bottom', '16px');
  await expect(homeLink.locator('path')).toHaveAttribute(
    'd',
    new RegExp(`^${HOME_FILLED_PATH}`),
  );

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

  // 마이로 이동
  const myLink = bottomNav.getByRole('link', { name: '마이' });

  await myLink.click();
  await expect(page).toHaveURL(/\/my$/);
  await expect(
    page.getByRole('heading', { level: 1, name: '마이' }),
  ).toBeVisible();
  await expect(myLink.locator('path')).toHaveAttribute(
    'd',
    new RegExp(`^${USER_FILLED_PATH}`),
  );

  // 홈으로 복귀
  await bottomNav.getByRole('link', { name: '홈' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { level: 1, name: '홈' }),
  ).toBeVisible();
});
