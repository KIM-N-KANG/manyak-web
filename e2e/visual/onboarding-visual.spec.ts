import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';
import { freezeVideos, waitForFonts } from '../fixtures/visual';

/**
 * 온보딩 화면(게스트 온보딩 페이지·신규 가입 초대 코드 다이얼로그)의 정적 상태를
 * 비교하는 비주얼 회귀 스펙. 노출 조건·이동 동작 검증은 `smoke/onboarding.spec.ts`·
 * `more/invite.spec.ts`가 담당한다.
 */

test.describe('온보딩 비주얼', () => {
  test('게스트 온보딩 페이지 (ONBD-GUEST)', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole('heading', {
        name: '눈을 떠보니 스토리 속 주인공이 되었다',
      }),
    ).toBeVisible();
    // 등장 애니메이션(마지막 요소는 버튼 영역)이 끝난 정적 상태에서 찍는다.
    await expect
      .poll(() =>
        page
          .getByRole('button', { name: '첫 장면 만들기' })
          .evaluate(
            (button) =>
              getComputedStyle(button.parentElement as HTMLElement).opacity,
          ),
      )
      .toBe('1');
    await freezeVideos(page);
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('onboarding-guest-page.png');
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
