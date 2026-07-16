import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';
import { waitForFonts } from '../fixtures/visual';

/**
 * 온보딩 다이얼로그(게스트 환영·신규 가입 초대 코드)의 정적 상태를 비교하는 비주얼 회귀 스펙.
 * 노출 조건·닫힘 동작 검증은 `smoke/onboarding.spec.ts`·`more/invite.spec.ts`가 담당한다.
 */

test.describe('온보딩 비주얼', () => {
  test('게스트 환영 다이얼로그 (ONBD-GUEST)', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: '키워드 몇 개로, 나만의 스토리 완성' }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('onboarding-guest-dialog.png');
  });

  test('신규 가입 초대 코드 다이얼로그 (ONBD-INVITE)', async ({ page }) => {
    await skipOnboarding(page);
    await mockMemberSession(page, { inviteOnboardingPending: true });

    await page.goto('/');

    await expect(page.getByText('초대 코드가 있나요?')).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('onboarding-invite-dialog.png');
  });
});
