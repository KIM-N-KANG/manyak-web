import { APP_PATH } from '@/constants/app-path';
import {
  ONBOARDING_CLOSING_LINE,
  ONBOARDING_SECTIONS,
} from '@/features/onboarding/constants';

import { expect, seedStoryIds, skipOnboarding, test } from '../fixtures/test';

test.describe('온보딩', () => {
  test('새 방문자는 첫 진입 시 온보딩 페이지로 이동한다', async ({ page }) => {
    const response = await page.goto('/');

    // 홈이 그려진 뒤 클라이언트에서 이동하면 화면이 깜빡이므로,
    // 서버(proxy) 리다이렉트로 도착했는지 응답 URL로 확인한다.
    expect(new URL(response!.url()).pathname).toBe('/onboarding');

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);
    await expect(
      page.getByRole('heading', {
        name: '눈을 떠보니 스토리 속 주인공이 되었다',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '첫 장면 만들기' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '홈으로 이동' }),
    ).toBeVisible();

    const onboardingActions = page
      .getByRole('button', { name: '첫 장면 만들기' })
      .locator('xpath=ancestor::nav');

    await expect(onboardingActions).toHaveCSS('padding-top', '0px');
  });

  test('온보딩 리다이렉트는 원본 쿼리를 유지한다', async ({ page }) => {
    const response = await page.goto(
      '/?utm_source=th&utm_medium=social&utm_campaign=organic&utm_content=bio',
    );

    // 서버 리다이렉트라 브라우저가 원본 URL을 렌더하지 않으므로, 여기서
    // 쿼리를 잃으면 분석 SDK가 유입 출처를 수집할 기회 자체가 사라진다.
    const url = new URL(response!.url());

    expect(url.pathname).toBe('/onboarding');
    expect(url.searchParams.get('utm_source')).toBe('th');
    expect(url.searchParams.get('utm_medium')).toBe('social');
    expect(url.searchParams.get('utm_campaign')).toBe('organic');
    expect(url.searchParams.get('utm_content')).toBe('bio');
    expect(url.searchParams.get('from')).toBe('/');
  });

  test('랜딩 섹션이 사용 흐름 순서대로 표시되고 끝까지 스크롤할 수 있다', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    // 섹션 제목이 스토리 만들기 → 채팅 → 공유 흐름 순서 그대로 나열된다.
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(
      ONBOARDING_SECTIONS.map((section) => section.title),
    );
    await expect(
      page.getByRole('img', { name: ONBOARDING_SECTIONS[0].scenes[0].alt }),
    ).toBeVisible();

    const closingLine = page.getByText(ONBOARDING_CLOSING_LINE);

    await closingLine.scrollIntoViewIfNeeded();
    await expect(closingLine).toBeVisible();
    // CTA는 스크롤 영역 밖의 고정 푸터라 끝까지 내려도 계속 보인다.
    await expect(
      page.getByRole('button', { name: '첫 장면 만들기' }),
    ).toBeVisible();
  });

  test('채팅·제작 탭으로 진입해도 온보딩 페이지로 이동한다', async ({
    page,
  }) => {
    await page.goto(APP_PATH.MAIN.CHATS);

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    await page.context().clearCookies();
    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);
  });

  test('온보딩을 본 사용자는 온보딩으로 이동하지 않는다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: '홈' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('만든 스토리만 있는 방문자(쿠키 없음)는 온보딩을 노출하지 않고 홈으로 되돌린다', async ({
    page,
  }) => {
    await seedStoryIds(page, ['s1']);
    await page.goto('/');

    // 서버(proxy)는 쿠키가 없어 일단 온보딩으로 보내지만, 페이지 가드가
    // 생성 이력을 보고 쿠키를 심은 뒤 홈으로 되돌린다.
    await expect(page).toHaveURL(/\/$/);

    await page.reload();
    await expect(page).toHaveURL(/\/$/);
  });

  test('열람한 사용자가 온보딩에 직접 접근하면 홈으로 되돌린다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/onboarding');

    await expect(page).toHaveURL(/\/$/);
  });

  test('"첫 장면 만들기"를 누르면 스토리 생성으로 이동하고 뒤로가기로 온보딩에 돌아오지 않는다', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    await page.getByRole('button', { name: '첫 장면 만들기' }).click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    // 퍼널이 마운트돼야 뒤로가기 가드가 걸리므로 첫 스텝 렌더를 기다린다.
    await expect(page.getByText('키워드를 선택해주세요')).toBeVisible();

    await page.goBack();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
  });

  test('로고를 누르면 홈으로 가고 새로고침 후에도 온보딩이 다시 뜨지 않는다', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    await page.getByRole('button', { name: '홈으로 이동' }).click();

    await expect(page).toHaveURL(/\/$/);

    await page.reload();
    await expect(page).toHaveURL(/\/$/);
  });
});
