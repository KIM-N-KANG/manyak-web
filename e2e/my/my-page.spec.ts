import type { Page } from '@playwright/test';

import {
  LINK_ACCOUNT_COPY,
  PROVIDER_LABEL,
} from '@/features/my/menu/constants/link-account-copy';

import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';

/**
 * 연동 상태를 담은 회원 프로필(GET /auth/me)을 목킹한다. linkedProviders가 연동
 * 상태의 정본이라 마이 페이지 연동 UI는 이 값만으로 결정된다(스펙 §4-5).
 */
async function mockMeWithLinkedProviders(
  page: Page,
  linkedProviders: string[],
): Promise<void> {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      json: {
        id: 'user-1',
        nickname: '배고픈 송아지',
        profileImageUrl: null,
        profileThumbnailBase64: null,
        status: 'ACTIVE',
        creditBalance: 0,
        attendedToday: false,
        linkedProviders,
      },
    }),
  );
}

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

  test('테마 변경 버튼은 시스템 설정 → 라이트 모드 → 다크 모드 순으로 순환한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/my');

    const themeButton = page.getByRole('button', { name: /테마/ });

    await expect(themeButton).toContainText('시스템 설정');

    await themeButton.click();
    await expect(themeButton).toContainText('라이트 모드');
    await expect(page.locator('html')).toHaveClass(/light/);

    await themeButton.click();
    await expect(themeButton).toContainText('다크 모드');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await themeButton.click();
    await expect(themeButton).toContainText('시스템 설정');
  });

  test('연동된 provider는 Chip으로, 미연동 provider는 연동 버튼으로 표시한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page, { nickname: '배고픈 송아지' });
    await mockMeWithLinkedProviders(page, ['google']);
    await page.goto('/my');

    const linkedAccounts = page.getByLabel(LINK_ACCOUNT_COPY.sectionLabel);

    await expect(
      linkedAccounts.getByText(PROVIDER_LABEL.google, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: LINK_ACCOUNT_COPY.linkButton('kakao') }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: LINK_ACCOUNT_COPY.linkButton('google'),
      }),
    ).toBeHidden();
  });

  test('연동 버튼을 누르면 재인증 순서와 해제 불가를 알리는 확인 다이얼로그가 열린다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page, { nickname: '배고픈 송아지' });
    await mockMeWithLinkedProviders(page, ['google']);
    await page.goto('/my');

    await page
      .getByRole('button', { name: LINK_ACCOUNT_COPY.linkButton('kakao') })
      .click();

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByText(LINK_ACCOUNT_COPY.confirmTitle('kakao')),
    ).toBeVisible();

    for (const line of LINK_ACCOUNT_COPY.confirmDescription('google')) {
      await expect(dialog.getByText(line)).toBeVisible();
    }

    await expect(
      dialog.getByRole('button', { name: LINK_ACCOUNT_COPY.confirmAction }),
    ).toBeVisible();
  });

  test('둘 다 연동했으면 Chip만 두 개 보이고 연동 버튼은 사라진다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page, { nickname: '배고픈 송아지' });
    await mockMeWithLinkedProviders(page, ['google', 'kakao']);
    await page.goto('/my');

    const linkedAccounts = page.getByLabel(LINK_ACCOUNT_COPY.sectionLabel);

    await expect(
      linkedAccounts.getByText(PROVIDER_LABEL.google, { exact: true }),
    ).toBeVisible();
    await expect(
      linkedAccounts.getByText(PROVIDER_LABEL.kakao, { exact: true }),
    ).toBeVisible();
    await expect(linkedAccounts.getByRole('button')).toHaveCount(0);
  });

  test('하단 탭은 홈·채팅·마이 3개다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/my');

    const nav = page.getByRole('navigation', { name: '하단 네비게이션' });

    await expect(nav.getByRole('link')).toHaveCount(3);
    await expect(nav.getByRole('link', { name: /홈/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: /채팅/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: /마이/ })).toBeVisible();
  });
});
