import { expect, skipOnboarding, test } from '../fixtures/test';

test.describe('약관·개인정보처리방침', () => {
  test('로그인 화면에 이관 1회 안내와 동의 고지 링크가 보인다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/login');

    await expect(page.getByText('계정당 한 번만 진행돼요')).toBeVisible();
    await expect(
      page.getByRole('link', { name: '서비스이용약관' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '개인정보처리방침' }),
    ).toBeVisible();
  });

  test('서비스이용약관 링크가 /terms 페이지를 연다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/login');
    await page.getByRole('link', { name: '서비스이용약관' }).click();

    await expect(page).toHaveURL('/terms');
    await expect(
      page.getByRole('banner').getByText('서비스이용약관'),
    ).toBeVisible();
    await expect(page.getByText('시행일 2026-07-10 · v1.0')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '제5조 (게스트 데이터의 이관)' }),
    ).toBeVisible();
  });

  test('개인정보처리방침 링크가 /privacy 페이지를 연다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/login');
    await page.getByRole('link', { name: '개인정보처리방침' }).click();

    await expect(page).toHaveURL('/privacy');
    await expect(
      page.getByRole('banner').getByText('개인정보처리방침'),
    ).toBeVisible();
    await expect(page.getByText('시행일 2026-07-27 · v1.1')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '1. 수집하는 개인정보 항목' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: '12. 행태정보의 수집 및 맞춤형 광고',
      }),
    ).toBeVisible();
  });

  test('게스트도 /terms에 직접 접근할 수 있다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/terms');

    await expect(
      page.getByRole('banner').getByText('서비스이용약관'),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '제5조 (게스트 데이터의 이관)' }),
    ).toBeVisible();
  });

  test('게스트가 /terms에 직접 진입한 뒤 뒤로가기를 누르면 홈으로 이동한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/terms');

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();

    await expect(page).toHaveURL('/');
  });
});
