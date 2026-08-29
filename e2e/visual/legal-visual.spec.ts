import { expect, skipOnboarding, test } from '../fixtures/test';
import { waitForFonts } from '../fixtures/visual';

/**
 * 서비스 이용약관·개인정보 처리방침 페이지의 정적 상태(상단 뷰포트)를 비교하는 비주얼 회귀 스펙.
 * 새 탭 진입·홈 로고 이동 동작 검증은 `legal/legal.spec.ts`가 담당한다.
 */

test.describe('약관·개인정보 비주얼', () => {
  test('서비스 이용약관 상단 (LEGAL-DOC)', async ({ page }) => {
    await skipOnboarding(page);

    await page.goto('/terms');

    await expect(
      page.getByRole('banner').getByRole('link', { name: '홈으로 이동' }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('terms-top.png');
  });

  test('개인정보 처리방침 상단 (LEGAL-DOC)', async ({ page }) => {
    await skipOnboarding(page);

    await page.goto('/privacy');

    await expect(
      page.getByRole('banner').getByRole('link', { name: '홈으로 이동' }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('privacy-top.png');
  });
});
