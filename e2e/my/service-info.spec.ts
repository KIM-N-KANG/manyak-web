import { expect, skipOnboarding, test } from '../fixtures/test';

test.describe('서비스 안내', () => {
  test('마이의 기타 섹션에서 서비스 안내로 진입한다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/my');

    await page.getByRole('link', { name: /서비스 안내/ }).click();

    await expect(page).toHaveURL('/my/about');
    await expect(
      page.getByRole('banner').getByText('서비스 안내'),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '크레딧 안내' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '게스트 이용 안내' }),
    ).toBeVisible();
  });

  test('약관 및 정책 링크가 각 문서를 새 탭에서 연다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/my/about');

    const termsPopupPromise = page.waitForEvent('popup');

    await page
      .getByRole('link', { name: '서비스 이용약관', exact: true })
      .click();

    const termsPage = await termsPopupPromise;

    await expect(page).toHaveURL('/my/about');
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

    await expect(page).toHaveURL('/my/about');
    await expect(privacyPage).toHaveURL('/privacy');
    await expect(
      privacyPage.getByRole('heading', {
        level: 1,
        name: '개인정보 처리방침',
      }),
    ).toBeVisible();
  });

  test('게스트가 직접 진입한 뒤 뒤로가기를 누르면 마이로 이동한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/my/about');

    await expect(
      page.getByRole('heading', { name: 'AI 콘텐츠 안내' }),
    ).toBeVisible();

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();

    await expect(page).toHaveURL('/my');
  });
});
