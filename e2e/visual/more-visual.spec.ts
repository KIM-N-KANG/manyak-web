import type { Page } from '@playwright/test';

import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';
import { waitForFonts } from '../fixtures/visual';

/**
 * 더보기·피드백·친구 초대·서비스 안내 화면의 안정된 정적 상태를 비교하는 비주얼 회귀 스펙.
 * 메뉴 이동·폼 제출 같은 동작 검증은 `more/*.spec.ts`·`feedback/*.spec.ts`가 담당한다.
 */

/**
 * 회원 프로필·크레딧 조회(/auth/me)를 목킹한다.
 *
 * @param page 대상 페이지
 */
const mockAuthMe = async (page: Page) => {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      json: {
        id: 'user-1',
        nickname: '배고픈 송아지',
        profileImageUrl: null,
        profileThumbnailBase64: null,
        status: 'ACTIVE',
        creditBalance: 1250,
        attendedToday: false,
      },
    }),
  );
};

test.describe('더보기 비주얼', () => {
  test('더보기 게스트 상태 (MORE-MENU)', async ({ page }) => {
    await skipOnboarding(page);

    await page.goto('/more');

    await expect(page.getByText('게스트')).toBeVisible();
    await expect(page.getByRole('link', { name: '로그인' })).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('more-guest.png');
  });

  test('더보기 회원 상태: 프로필·크레딧 카드 (MORE-MENU)', async ({ page }) => {
    await skipOnboarding(page);
    await mockMemberSession(page, { nickname: '배고픈 송아지' });
    await mockAuthMe(page);

    await page.goto('/more');

    await expect(page.getByText('배고픈 송아지')).toBeVisible();
    await expect(page.getByRole('button', { name: /로그아웃/ })).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('more-member.png');
  });

  test('피드백 폼 기본 상태 (MORE-FEEDBACK)', async ({ page }) => {
    await skipOnboarding(page);

    await page.goto('/more/feedback');

    await expect(
      page.getByRole('button', { name: '피드백 보내기' }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('feedback-form.png');
  });

  test('친구 초대 회원 상태: 내 코드·공유·등록 (MORE-INVITE)', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
    await page.route('**/api/v1/users/me/invite', (route) =>
      route.fulfill({
        json: {
          inviteCode: 'CW6VZX7D',
          monthlyRewardCount: 3,
          monthlyRewardLimit: 10,
        },
      }),
    );
    // 카카오 SDK 로드가 외부로 나가지 않도록 스텁한다(공유 버튼 활성 상태 고정).
    await page.route('**/kakao_js_sdk/**', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `window.Kakao = {
          isInitialized: function () { return true; },
          init: function () {},
          Share: { sendDefault: function () {} },
        };`,
      }),
    );

    await page.goto('/more/invite');

    await expect(
      page.getByRole('button', { name: '코드 복사하기' }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('invite-member.png');
  });

  test('서비스 안내 상단 (MORE-INFO)', async ({ page }) => {
    await skipOnboarding(page);

    await page.goto('/more/about');

    await expect(
      page.getByRole('heading', { name: '크레딧 안내' }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('service-info-top.png');
  });
});
