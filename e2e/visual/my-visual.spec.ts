import type { Page } from '@playwright/test';

import { LINK_ACCOUNT_COPY } from '@/features/my/menu/constants/link-account-copy';
import {
  LINK_RESULT_COOKIE,
  serializeLinkResult,
} from '@/lib/auth/link-account';

import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';
import { waitForDarkTheme, waitForFonts } from '../fixtures/visual';

/**
 * 마이·피드백·친구 초대·서비스 안내 화면의 안정된 정적 상태를 비교하는 비주얼 회귀 스펙.
 * 메뉴 이동·폼 제출 같은 동작 검증은 `my/*.spec.ts`·`feedback/*.spec.ts`가 담당한다.
 */

/**
 * 회원 프로필·크레딧 조회(/auth/me)를 목킹한다. 회원은 로그인 수단이 최소 하나라
 * linkedProviders도 함께 담아야 실제 화면(연동 Chip·연동 버튼)과 같아진다.
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
        linkedProviders: ['google'],
      },
    }),
  );
};

test.describe('마이 비주얼', () => {
  test('마이 게스트 상태 (MY-MENU)', async ({ page }) => {
    await skipOnboarding(page);

    await page.goto('/my');

    await expect(page.getByText('게스트')).toBeVisible();
    await expect(page.getByRole('link', { name: '로그인' })).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('my-guest.png');
  });

  test('마이 회원 상태: 프로필·크레딧 카드 (MY-MENU)', async ({ page }) => {
    await skipOnboarding(page);
    await mockMemberSession(page, { nickname: '배고픈 송아지' });
    await mockAuthMe(page);

    await page.goto('/my');

    await expect(page.getByText('배고픈 송아지')).toBeVisible();
    await expect(page.getByRole('button', { name: /로그아웃/ })).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('my-member.png');
  });

  test('계정 연동 확인 다이얼로그 (MY-MENU)', async ({ page }) => {
    await skipOnboarding(page);
    await mockMemberSession(page, { nickname: '배고픈 송아지' });
    await mockAuthMe(page);

    await page.goto('/my');
    await page
      .getByRole('button', { name: LINK_ACCOUNT_COPY.linkButton('kakao') })
      .click();

    await expect(
      page
        .getByRole('dialog')
        .getByText(LINK_ACCOUNT_COPY.confirmTitle('kakao')),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('my-link-confirm-dialog.png');
  });

  test('계정 연동 실패: 다른 계정에 연결됨 다이얼로그 (MY-MENU)', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page, { nickname: '배고픈 송아지' });
    await mockAuthMe(page);
    // 연동 결과는 서버가 쿠키로 남기고 마이 페이지가 1회 소비한다(스펙 FE-SCREEN-008).
    await page.context().addCookies([
      {
        name: LINK_RESULT_COOKIE,
        value: serializeLinkResult({
          result: 'linked_to_other_user',
          provider: 'kakao',
        }),
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/my');

    await expect(
      page.getByRole('dialog').getByText(LINK_ACCOUNT_COPY.linkedToOtherTitle),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('my-link-conflict-dialog.png');
  });

  test('피드백 폼 기본 상태 (MY-FEEDBACK)', async ({ page }) => {
    await skipOnboarding(page);

    await page.goto('/my/feedback');

    await expect(
      page.getByRole('button', { name: '피드백 보내기' }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('feedback-form.png');
  });

  test('친구 초대 회원 상태: 내 코드·공유·등록 (MY-INVITE)', async ({
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

    await page.goto('/my/invite');

    await expect(
      page.getByRole('button', { name: '코드 복사하기' }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('invite-member.png');
  });

  test('서비스 안내 상단 (MY-INFO)', async ({ page }) => {
    await skipOnboarding(page);

    await page.goto('/my/about');

    await expect(
      page.getByRole('heading', { name: '크레딧 안내' }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('service-info-top.png');
  });
});

/** 다크 모드 대표 스냅샷. 크레딧 카드·섹션 메뉴와 destructive(로그아웃) 토큰을 덮는다. */
test.describe('마이 다크 모드 비주얼', () => {
  test.use({ colorScheme: 'dark' });

  test('마이 회원 상태 (다크)', async ({ page }) => {
    await skipOnboarding(page);
    await mockMemberSession(page, { nickname: '배고픈 송아지' });
    await mockAuthMe(page);

    await page.goto('/my');

    await expect(page.getByText('배고픈 송아지')).toBeVisible();
    await expect(page.getByRole('button', { name: /로그아웃/ })).toBeVisible();
    await waitForDarkTheme(page);
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('my-member-dark.png');
  });
});
