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
      page.getByRole('button', { name: '나중에 하기' }),
    ).toBeVisible();
  });

  test('온보딩 페이지는 스크롤 없이 한 화면에 들어온다', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);
    await expect(
      page.getByRole('button', { name: '첫 장면 만들기' }),
    ).toBeVisible();
    // 등장 애니메이션의 이동(translate)이 일시적으로 오버플로를 만들 수
    // 있으므로, 마지막 요소(버튼 영역)가 자리를 잡은 뒤에 검사한다.
    await expect
      .poll(() =>
        page
          .getByRole('button', { name: '첫 장면 만들기' })
          .evaluate(
            (button) =>
              getComputedStyle(button.parentElement as HTMLElement).opacity,
          ),
      )
      .toBe('1');

    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll('*')].some(
        (element) => element.scrollHeight - element.clientHeight > 1,
      ),
    );

    expect(overflow).toBe(false);
  });

  test('미리보기 영상을 자동 재생한다', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    const video = page.locator('video');

    await expect(video).toHaveCount(1);
    await expect
      .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
      .toBeGreaterThan(0);
  });

  test('모션 감소 설정에서는 영상 대신 정지 이미지를 보여준다', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);
    await expect(page.locator('video')).toHaveCount(0);
    await expect(
      page.getByRole('img', {
        name: '키워드를 고르고 스토리라인을 선택해 스토리를 만드는 과정',
      }),
    ).toBeVisible();
  });

  test('채팅 탭으로 진입해도 온보딩 페이지로 이동한다', async ({ page }) => {
    await page.goto('/chats');

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

    await expect(page).toHaveURL(/\/stories\/new$/);
    // 퍼널이 마운트돼야 뒤로가기 가드가 걸리므로 첫 스텝 렌더를 기다린다.
    await expect(page.getByText('키워드를 선택해주세요')).toBeVisible();

    await page.goBack();

    await expect(page).toHaveURL(/\/$/);
  });

  test('"나중에 하기"를 누르면 홈으로 가고 새로고침 후에도 온보딩이 다시 뜨지 않는다', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    await page.getByRole('button', { name: '나중에 하기' }).click();

    await expect(page).toHaveURL(/\/$/);

    await page.reload();
    await expect(page).toHaveURL(/\/$/);
  });
});
