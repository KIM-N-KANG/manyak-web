import { expect, skipOnboarding, test } from '../fixtures/test';

test.describe('서비스 안내', () => {
  test('더보기 기타 섹션에서 서비스 안내로 진입한다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/more');

    await page.getByRole('link', { name: /서비스 안내/ }).click();

    await expect(page).toHaveURL('/more/about');
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

  test('약관 및 정책 링크가 각 문서를 연다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/more/about');

    await page.getByRole('link', { name: '서비스이용약관' }).click();
    await expect(page).toHaveURL('/terms');
    await expect(
      page.getByRole('banner').getByText('서비스이용약관'),
    ).toBeVisible();

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();
    await expect(page).toHaveURL('/more/about');

    await page.getByRole('link', { name: '개인정보처리방침' }).click();
    await expect(page).toHaveURL('/privacy');
    await expect(
      page.getByRole('banner').getByText('개인정보처리방침'),
    ).toBeVisible();
  });

  test('게스트가 직접 진입한 뒤 뒤로가기를 누르면 더보기로 이동한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/more/about');

    await expect(
      page.getByRole('heading', { name: 'AI 콘텐츠 안내' }),
    ).toBeVisible();

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();

    await expect(page).toHaveURL('/more');
  });
});
