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

  test('로그인 화면은 약관 동의 고지·링크와 이관 안내를 두지 않는다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/login');

    await expect(
      page.getByRole('button', { name: /카카오로 시작하기/ }),
    ).toBeVisible();
    await expect(page.getByText('계정마다 처음 로그인할 때')).toHaveCount(0);
    // 약관·개인정보 처리방침 동의는 로그인 직후 동의 시트에서 명시적으로 받는다(auth/consent).
    await expect(page.getByText('동의하는 것으로 간주해요')).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: '서비스 이용약관', exact: true }),
    ).toHaveCount(0);
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
