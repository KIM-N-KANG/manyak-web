import { expect, seedStoryIds, skipOnboarding, test } from '../fixtures/test';

test.describe('온보딩', () => {
  test('새 방문자는 첫 진입 시 온보딩 페이지로 이동한다', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole('heading', {
        name: '뭘 쓸지 고민 말고 키워드부터 골라보세요',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '첫 스토리 만들기' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '먼저 둘러보기' }),
    ).toBeVisible();
  });

  test('온보딩 페이지는 스크롤 없이 한 화면에 들어온다', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole('button', { name: '첫 스토리 만들기' }),
    ).toBeVisible();

    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll('*')].some(
        (element) => element.scrollHeight - element.clientHeight > 1,
      ),
    );

    expect(overflow).toBe(false);
  });

  test('채팅 탭으로 진입해도 온보딩 페이지로 이동한다', async ({ page }) => {
    await page.goto('/chats');

    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test('온보딩을 본 사용자는 온보딩으로 이동하지 않는다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: '홈' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('만든 스토리가 있으면 온보딩으로 이동하지 않는다', async ({ page }) => {
    await seedStoryIds(page, ['s1']);
    await page.goto('/');

    await expect(page).toHaveURL(/\/$/);
  });

  test('열람한 사용자가 온보딩에 직접 접근하면 홈으로 되돌린다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/onboarding');

    await expect(page).toHaveURL(/\/$/);
  });

  test('"첫 스토리 만들기"를 누르면 스토리 생성으로 이동하고 뒤로가기로 온보딩에 돌아오지 않는다', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.getByRole('button', { name: '첫 스토리 만들기' }).click();

    await expect(page).toHaveURL(/\/stories\/new$/);
    // 퍼널이 마운트돼야 뒤로가기 가드가 걸리므로 첫 스텝 렌더를 기다린다.
    await expect(page.getByText('키워드를 선택해주세요')).toBeVisible();

    await page.goBack();

    await expect(page).toHaveURL(/\/$/);
  });

  test('"먼저 둘러보기"를 누르면 홈으로 가고 새로고침 후에도 온보딩이 다시 뜨지 않는다', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.getByRole('button', { name: '먼저 둘러보기' }).click();

    await expect(page).toHaveURL(/\/$/);

    await page.reload();
    await expect(page).toHaveURL(/\/$/);
  });
});
