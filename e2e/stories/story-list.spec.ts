import { mockMemberSession } from '../fixtures/auth';
import { expect, seedStoryIds, skipOnboarding, test } from '../fixtures/test';

// 스토리 목록은 localStorage의 ID로 POST /api/v1/stories/batch 를 호출해 카드를 그린다.
// customInstance가 응답 body를 { data, status }로 감싸므로, 모킹 body는 StorySummaryResponse 배열이다.
const STORIES_BATCH = '**/api/v1/stories/batch';

const story = (id: string, title: string) => ({
  id,
  title,
  oneLineIntro: '한 줄 소개입니다',
  genres: ['판타지'],
  createdAt: '2026-06-01T00:00:00Z',
});

test.describe('스토리 목록', () => {
  test('보관한 ID로 스토리 카드 목록을 보여준다 (US-2-1)', async ({ page }) => {
    await seedStoryIds(page, ['s1', 's2']);
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          story('s1', '용의 계곡'),
          story('s2', '별빛 항해'),
        ]),
      });
    });

    await page.goto('/');

    await expect(page.getByText('용의 계곡', { exact: true })).toBeVisible();
    await expect(page.getByText('별빛 항해', { exact: true })).toBeVisible();
  });

  test('카드를 누르면 스토리 상세로 이동한다 (US-2-2)', async ({ page }) => {
    await seedStoryIds(page, ['s1']);
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([story('s1', '용의 계곡')]),
      });
    });

    await page.goto('/');
    await page.getByRole('link', { name: '용의 계곡 상세 보기' }).click();

    await expect(page).toHaveURL(/\/stories\/s1$/);
  });

  test('로드에 실패하면 다시 시도로 복구한다 (US-2-6)', async ({ page }) => {
    await seedStoryIds(page, ['s1']);

    let callCount = 0;

    await page.route(STORIES_BATCH, async (route) => {
      callCount += 1;

      if (callCount === 1) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: '{}',
        });

        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([story('s1', '용의 계곡')]),
      });
    });

    await page.goto('/');

    await expect(page.getByText('스토리를 불러오지 못했어요')).toBeVisible();
    await page.getByRole('button', { name: '다시 시도' }).click();

    await expect(page.getByText('용의 계곡', { exact: true })).toBeVisible();
  });

  test('스토리를 삭제하면 완료 안내가 뜬다 (US-2-4)', async ({ page }) => {
    await seedStoryIds(page, ['s1']);
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([story('s1', '용의 계곡')]),
      });
    });
    await page.route('**/api/v1/stories/s1', async (route) => {
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/');
    await page.getByRole('button', { name: '스토리 옵션 더보기' }).click();
    await page.getByRole('menuitem', { name: '삭제하기' }).click();

    const dialog = page.getByRole('alertdialog');

    await expect(dialog.getByText('스토리를 삭제할까요?')).toBeVisible();
    await dialog.getByRole('button', { name: '삭제하기' }).click();

    await expect(page.getByText('스토리를 삭제했어요')).toBeVisible();
  });

  test('로그인 상태에서는 서버의 내 스토리 목록을 보여준다', async ({
    page,
  }) => {
    // 로컬 ID 없이 회원 목록 API만으로 카드를 그린다(이관도 발동하지 않음).
    await skipOnboarding(page);
    await mockMemberSession(page);
    await page.route('**/api/v1/users/me/stories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([story('s1', '회원의 서재')]),
      });
    });

    await page.goto('/');

    await expect(page.getByText('회원의 서재', { exact: true })).toBeVisible();
  });

  test('로그인 상태에서 스토리를 삭제하면 목록에서 사라진다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);

    let deleted = false;

    await page.route('**/api/v1/users/me/stories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(deleted ? [] : [story('s1', '회원의 서재')]),
      });
    });
    await page.route('**/api/v1/stories/s1', async (route) => {
      deleted = true;
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/');
    await page.getByRole('button', { name: '스토리 옵션 더보기' }).click();
    await page.getByRole('menuitem', { name: '삭제하기' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: '삭제하기' })
      .click();

    await expect(page.getByText('스토리를 삭제했어요')).toBeVisible();
    await expect(
      page.getByText('회원의 서재', { exact: true }),
    ).not.toBeVisible();
  });
});
