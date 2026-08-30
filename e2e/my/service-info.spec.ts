import { formatDocumentTitle } from '@/constants/site';
import {
  SERVICE_INFO_CREDIT_ITEMS,
  SERVICE_INFO_TITLE,
} from '@/features/about/constants';

import { expect, skipOnboarding, test } from '../fixtures/test';

test.describe('서비스 안내', () => {
  test('마이의 기타 섹션에서 서비스 안내를 새 탭으로 연다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/my');

    const serviceInfoLink = page.getByRole('link', {
      name: SERVICE_INFO_TITLE,
      exact: true,
    });
    const popupPromise = page.waitForEvent('popup');

    await expect(serviceInfoLink).toHaveAttribute('target', '_blank');
    await expect(serviceInfoLink).toHaveAttribute('rel', 'noopener noreferrer');
    await serviceInfoLink.click();

    const serviceInfoPage = await popupPromise;

    await expect(page).toHaveURL('/my');
    await expect(serviceInfoPage).toHaveURL('/about');
    await expect(serviceInfoPage).toHaveTitle(
      formatDocumentTitle(SERVICE_INFO_TITLE),
    );
    await expect(
      serviceInfoPage.getByRole('heading', {
        level: 1,
        name: SERVICE_INFO_TITLE,
      }),
    ).toBeVisible();
    await expect(
      serviceInfoPage
        .getByRole('banner')
        .getByRole('link', { name: '홈으로 이동' }),
    ).toBeVisible();
    await expect(
      serviceInfoPage.getByRole('button', {
        name: '이전 페이지로 돌아가기 버튼',
      }),
    ).toHaveCount(0);
    await expect(
      serviceInfoPage.getByRole('heading', { name: '크레딧 안내' }),
    ).toBeVisible();

    for (const item of SERVICE_INFO_CREDIT_ITEMS) {
      await expect(
        serviceInfoPage.getByText(item, { exact: true }),
      ).toBeVisible();
    }

    await expect(
      serviceInfoPage.getByRole('heading', { name: '게스트 이용 안내' }),
    ).toBeVisible();
  });

  test('약관 및 정책 링크가 각 문서를 새 탭에서 연다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/about');

    const termsPopupPromise = page.waitForEvent('popup');

    await page
      .getByRole('link', { name: '서비스 이용약관', exact: true })
      .click();

    const termsPage = await termsPopupPromise;

    await expect(page).toHaveURL('/about');
    await expect(termsPage).toHaveURL('/terms');
    await expect(
      termsPage.getByRole('heading', { level: 1, name: '서비스 이용약관' }),
    ).toBeVisible();
    await termsPage.close();

    const privacyPopupPromise = page.waitForEvent('popup');

    await page
      .getByRole('link', { name: '개인정보 처리방침', exact: true })
      .click();

    const privacyPage = await privacyPopupPromise;

    await expect(page).toHaveURL('/about');
    await expect(privacyPage).toHaveURL('/privacy');
    await expect(
      privacyPage.getByRole('heading', {
        level: 1,
        name: '개인정보 처리방침',
      }),
    ).toBeVisible();
  });

  test('게스트가 직접 진입한 뒤 로고를 누르면 홈으로 이동한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/about');

    await expect(
      page.getByRole('heading', { name: 'AI 콘텐츠 안내' }),
    ).toBeVisible();

    await page
      .getByRole('banner')
      .getByRole('link', { name: '홈으로 이동' })
      .click();

    await expect(page).toHaveURL('/');
  });
});
