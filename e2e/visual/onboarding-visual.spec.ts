import { formatCreditAmount } from '@/constants/credit';
import { buildInviteRewardCopy } from '@/features/my/invite/constants';
import { ONBOARDING_DESCRIPTION } from '@/features/onboarding/constants';

import {
  CREDIT_POLICY_FIXTURE,
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';
import { waitForFonts } from '../fixtures/visual';

/**
 * 온보딩 화면(게스트 온보딩 페이지·신규 가입 초대 코드 바텀 시트)의 정적 상태를
 * 비교하는 비주얼 회귀 스펙. 노출 조건·이동 동작 검증은 `smoke/onboarding.spec.ts`·
 * `my/invite.spec.ts`가 담당한다.
 */

test.describe('온보딩 비주얼', () => {
  test('게스트 온보딩 페이지 (ONBD-GUEST)', async ({ page }) => {
    // 원본 WebP로 화면만 비교하고 Next.js 이미지 최적화의 로딩 검사는 하지 않는다.
    await page.route('**/_next/image**', async (route) => {
      const url = new URL(route.request().url());
      const source = url.searchParams.get('url');

      if (source?.startsWith('/onboarding/')) {
        await route.continue({ url: new URL(source, url.origin).href });
      } else {
        await route.continue();
      }
    });
    // 첫 화면 이미지가 일정 간격으로 바뀌므로, 모션 감소로 첫 장에 고정해 찍는다.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);
    await expect(
      page.getByRole('heading', {
        name: '눈을 떠보니 스토리 속 주인공이 되었다',
      }),
    ).toBeVisible();
    // 등장 애니메이션(마지막 요소는 제목 아래 설명)이 끝난 정적 상태에서 찍는다.
    await expect
      .poll(() =>
        page
          .getByText(ONBOARDING_DESCRIPTION)
          .evaluate((element) => getComputedStyle(element).opacity),
      )
      .toBe('1');
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('onboarding-guest-page.png');
  });

  test('신규 가입 초대 코드 바텀 시트 (ONBD-INVITE)', async ({ page }) => {
    await skipOnboarding(page);
    await mockMemberSession(page, { inviteOnboardingPending: true });

    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        name: buildInviteRewardCopy(
          formatCreditAmount(CREDIT_POLICY_FIXTURE.inviteReward),
        ).onboardingTitle,
      }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('onboarding-invite-sheet.png');
  });
});
