import { APP_PATH } from '@/constants/app-path';
import { formatCreditAmount } from '@/constants/credit';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';

import { oneLine } from '../fixtures/copy';
import { CREDIT_POLICY_FIXTURE, expect, test } from '../fixtures/test';

test.describe('로그인 화면', () => {
  test('카카오·Google 로그인 버튼을 세로로 보여준다', async ({ page }) => {
    await page.goto('/login');

    const kakaoButton = page.getByRole('button', { name: /카카오로 시작하기/ });
    const googleButton = page.getByRole('button', {
      name: /Google로 시작하기/,
    });

    await expect(kakaoButton).toBeVisible();
    await expect(googleButton).toBeVisible();

    // 카카오 버튼이 Google 버튼 위에 배치된다(스펙 §3-8).
    const kakaoBox = await kakaoButton.boundingBox();
    const googleBox = await googleButton.boundingBox();

    expect(kakaoBox && googleBox && kakaoBox.y < googleBox.y).toBe(true);
    await expect(
      page.getByRole('button', { name: '이전 페이지로 돌아가기 버튼' }),
    ).toBeVisible();
    // 하단 탭이 없는 집중형 화면이다.
    await expect(
      page.getByRole('navigation', { name: '하단 네비게이션' }),
    ).toBeHidden();
  });

  test('버튼 위에 서버 가입 보상 배지를, 아래에 약관과 처리방침 링크를 둔다 (KNK-1900)', async ({
    page,
  }) => {
    await page.goto(APP_PATH.LOGIN);

    const { prefix, unit, suffix } = LOGIN_COPY.signupBenefit;
    const badge = page.getByText(
      `${prefix} ${formatCreditAmount(CREDIT_POLICY_FIXTURE.signupReward)} ${unit} ${suffix}`,
      { exact: true },
    );
    const kakaoButton = page.getByRole('button', { name: /카카오로 시작하기/ });
    const terms = page.getByRole('link', {
      name: LOGIN_COPY.legalTerms,
      exact: true,
    });
    const privacy = page.getByRole('link', {
      name: LOGIN_COPY.legalPrivacy,
      exact: true,
    });

    await expect(badge).toBeVisible();
    await expect(terms).toHaveAttribute('href', APP_PATH.TERMS);
    await expect(privacy).toHaveAttribute('href', APP_PATH.PRIVACY);
    await expect(page.getByText(oneLine(LOGIN_COPY.linkNotice))).toHaveCount(0);

    const badgeBox = await badge.boundingBox();
    const kakaoBox = await kakaoButton.boundingBox();
    const termsBox = await terms.boundingBox();

    expect(badgeBox!.y).toBeLessThan(kakaoBox!.y);
    expect(termsBox!.y).toBeGreaterThan(kakaoBox!.y);

    await terms.click();
    await expect(page).toHaveURL(APP_PATH.TERMS);
  });

  test('마이의 로그인 버튼이 /login으로 이동한다', async ({ page }) => {
    await page.goto('/my');
    await page.getByRole('link', { name: '로그인' }).click();

    await expect(page).toHaveURL('/login');
  });

  test('뒤로 갈 앱 히스토리가 없으면 스토리 목록으로 폴백한다', async ({
    page,
  }) => {
    // 딥링크·OAuth 리다이렉트 등으로 뒤로 갈 앱 히스토리가 없는 진입을 재현(직접 /login 진입)
    await page.goto('/login');
    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();

    await expect(page).toHaveURL('/');
  });

  test('앱 내에서 진입했으면 실제 뒤로가기로 이전 화면에 돌아간다', async ({
    page,
  }) => {
    await page.goto('/my');
    await page.getByRole('link', { name: '로그인' }).click();
    await expect(page).toHaveURL('/login');

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();

    await expect(page).toHaveURL('/my');
  });
});
