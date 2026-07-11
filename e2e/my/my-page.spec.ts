import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';

test.describe('마이', () => {
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

  test('회원 프로필 이미지는 me 응답의 base64 썸네일을 렌더한다', async ({
    page,
  }) => {
    // 1×1 투명 PNG(접두사 없는 순수 base64) — 백엔드 profileThumbnailBase64 형식과 동일.
    const thumbnailBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    await skipOnboarding(page);
    await mockMemberSession(page, { nickname: '배고픈 송아지' });
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        json: {
          id: 'user-1',
          nickname: '배고픈 송아지',
          profileImageUrl: null,
          profileThumbnailBase64: thumbnailBase64,
          status: 'ACTIVE',
          creditBalance: 0,
          attendedToday: false,
        },
      }),
    );
    await page.goto('/my');

    const avatar = page.locator('img[src^="data:image/png;base64,"]');

    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute(
      'src',
      `data:image/png;base64,${thumbnailBase64}`,
    );
  });

  test('하단 탭은 스토리·채팅·마이 3개다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/my');

    const nav = page.getByRole('navigation', { name: '하단 네비게이션' });

    await expect(nav.getByRole('link')).toHaveCount(3);
    await expect(nav.getByRole('link', { name: /스토리/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: /채팅/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: /마이/ })).toBeVisible();
  });
});
