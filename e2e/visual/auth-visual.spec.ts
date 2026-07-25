import { expect, skipOnboarding, test } from '../fixtures/test';
import { waitForFonts } from '../fixtures/visual';

/**
 * 로그인 화면의 정적 상태를 비교하는 비주얼 회귀 스펙.
 * 뒤로가기·이동 동작 검증은 `my/login-page.spec.ts`가 담당한다.
 */

test.describe('계정 비주얼', () => {
  test('로그인 페이지: 단일 CTA·이관 안내·동의 고지 (AUTH-LOGIN)', async ({
    page,
  }) => {
    await skipOnboarding(page);

    await page.goto('/login');

    await expect(
      page.getByRole('button', { name: /Google로 시작하기/ }),
    ).toBeVisible();
    await expect(page.getByText('계정당 한 번만 진행돼요')).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('login-page.png');
  });
});
