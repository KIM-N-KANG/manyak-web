import { formatDocumentTitle } from '@/constants/site';
import { privacyContent } from '@/features/legal/content/privacy-content';
import { termsContent } from '@/features/legal/content/terms-content';

import { expect, skipOnboarding, test } from '../fixtures/test';

test.describe('약관·개인정보 처리방침', () => {
  test('브라우저 탭 제목이 문서 제목 - 마냑이 된다', async ({ page }) => {
    await page.goto('/terms');
    await expect(page).toHaveTitle(formatDocumentTitle(termsContent.title));

    await page.goto('/privacy');
    await expect(page).toHaveTitle(formatDocumentTitle(privacyContent.title));
  });

  test('로그인 화면에 이관 1회 안내와 동의 고지 링크가 보인다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/login');

    await expect(page.getByText('계정마다 처음 로그인할 때')).toBeVisible();
    await expect(
      page.getByText('한 번만 이 기기의 스토리와 채팅을 그 계정에 저장해요'),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '서비스 이용약관', exact: true }),
    ).toHaveAttribute('target', '_blank');
    await expect(
      page.getByRole('link', { name: '개인정보 처리방침', exact: true }),
    ).toHaveAttribute('target', '_blank');
  });

  test('서비스 이용약관 링크가 새 탭에서 /terms 페이지를 연다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/login');

    const popupPromise = page.waitForEvent('popup');

    await page
      .getByRole('link', { name: '서비스 이용약관', exact: true })
      .click();

    const termsPage = await popupPromise;

    await expect(page).toHaveURL('/login');
    await expect(termsPage).toHaveURL('/terms');
    await expect(
      termsPage.getByRole('heading', { level: 1, name: '서비스 이용약관' }),
    ).toBeVisible();
    await expect(
      termsPage.getByRole('banner').getByRole('link', { name: '홈으로 이동' }),
    ).toBeVisible();
    await expect(termsPage.getByText('시행일 2026-09-01 · v1.2')).toBeVisible();
    await expect(
      termsPage.getByRole('heading', {
        name: '제6조 (게스트 데이터와 회원 전환)',
      }),
    ).toBeVisible();
  });

  test('개인정보 처리방침 링크가 새 탭에서 /privacy 페이지를 연다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/login');

    const popupPromise = page.waitForEvent('popup');

    await page
      .getByRole('link', { name: '개인정보 처리방침', exact: true })
      .click();

    const privacyPage = await popupPromise;

    await expect(page).toHaveURL('/login');
    await expect(privacyPage).toHaveURL('/privacy');
    await expect(
      privacyPage.getByRole('heading', {
        level: 1,
        name: '개인정보 처리방침',
      }),
    ).toBeVisible();
    await expect(
      privacyPage
        .getByRole('banner')
        .getByRole('link', { name: '홈으로 이동' }),
    ).toBeVisible();
    await expect(
      privacyPage.getByText('시행일 2026-09-01 · v1.3'),
    ).toBeVisible();
    await expect(
      privacyPage.getByRole('heading', {
        name: '1. 개인정보처리자와 적용 범위',
      }),
    ).toBeVisible();
    await expect(
      privacyPage.getByRole('heading', {
        name: '12. 행태정보의 수집 및 맞춤형 광고',
      }),
    ).toBeVisible();
    await expect(
      privacyPage.getByRole('heading', {
        name: '13. AI 처리와 평가 데이터 활용',
      }),
    ).toBeVisible();
  });

  test('게스트도 /terms에 직접 접근할 수 있다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/terms');

    await expect(
      page.getByRole('heading', { level: 1, name: '서비스 이용약관' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: '제6조 (게스트 데이터와 회원 전환)',
      }),
    ).toBeVisible();
  });

  test('헤더에는 뒤로가기와 문서 제목 대신 홈 로고가 보인다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/privacy');

    const header = page.getByRole('banner');

    await expect(
      header.getByRole('link', { name: '홈으로 이동' }),
    ).toBeVisible();
    await expect(
      header.getByRole('button', { name: '이전 페이지로 돌아가기 버튼' }),
    ).toHaveCount(0);
    await expect(header.getByText('개인정보 처리방침')).toHaveCount(0);
  });

  test('게스트가 /terms에 직접 진입한 뒤 헤더 로고를 누르면 홈으로 이동한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/terms');

    await page.getByRole('link', { name: '홈으로 이동' }).click();

    await expect(page).toHaveURL('/');
  });
});
