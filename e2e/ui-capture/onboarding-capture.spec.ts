import { formatCreditAmount } from '@/constants/credit';
import { buildInviteRewardCopy } from '@/features/my/invite/constants';

import { waitForFonts } from '../fixtures/capture';
import {
  CREDIT_POLICY_FIXTURE,
  expect,
  mockMemberSession,
  seedInviteOnboardingNextRun,
  test,
} from '../fixtures/test';

/**
 * 신규 가입 초대 코드 바텀 시트의 정적 상태를 캡처하는 화면 캡처 스펙.
 * 노출 조건과 동작 검증은 `my/invite.spec.ts`가 담당한다.
 */

test.describe('온보딩 캡처', () => {
  test('신규 가입 초대 코드 바텀 시트 (ONBD-INVITE)', async ({ page }) => {
    await mockMemberSession(page, { inviteOnboardingPending: true });
    await seedInviteOnboardingNextRun(page);

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
