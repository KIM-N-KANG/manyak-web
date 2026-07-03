import type { Route } from '@playwright/test';

import { expect, test } from '../fixtures/test';

// 스토리 상세는 GET /api/v1/stories/{id} 로 단건 조회한다. (/stories/[id]는 온보딩 게이팅 없음)
// 같은 URL을 DELETE 로 삭제하므로 메서드로 분기해 모킹한다.
const STORY_DETAIL = '**/api/v1/stories/s1';

const storyDetail = {
  id: 's1',
  title: '용의 계곡',
  oneLineIntro: '잃어버린 용을 찾는 모험',
  description: '깊은 계곡 속 전설의 이야기',
  genres: ['판타지', '모험'],
  startSetting: {
    name: '계곡 입구',
    prologue: '안개 낀 계곡 앞에 섰다',
    startSituation: '용의 흔적을 따라왔다',
  },
};

const fulfillStoryDetail = async (route: Route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(storyDetail),
  });
};

test.describe('스토리 상세', () => {
  test('스토리 제목·소개·설명을 보여준다 (US-4-1)', async ({ page }) => {
    await page.route(STORY_DETAIL, fulfillStoryDetail);

    await page.goto('/stories/s1');

    await expect(
      page.getByRole('heading', { level: 1, name: '용의 계곡' }),
    ).toBeVisible();
    await expect(page.getByText('잃어버린 용을 찾는 모험')).toBeVisible();
    await expect(page.getByText('깊은 계곡 속 전설의 이야기')).toBeVisible();
  });

  test('"채팅 시작하기"를 누르면 채팅 화면으로 이동한다 (US-4-2)', async ({
    page,
  }) => {
    await page.route(STORY_DETAIL, fulfillStoryDetail);
    await page.route('**/api/v1/chats', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'c1', storyId: 's1', prologue: '프롤로그' }),
      });
    });

    await page.goto('/stories/s1');
    await page.getByRole('button', { name: '채팅 시작하기' }).click();

    await expect(page).toHaveURL(/\/chats\/c1$/);
  });

  test('스토리를 삭제하면 완료 안내가 뜨고 목록으로 돌아간다 (US-4-3)', async ({
    page,
  }) => {
    await page.route(STORY_DETAIL, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204, body: '' });

        return;
      }

      await fulfillStoryDetail(route);
    });

    await page.goto('/stories/s1');
    await page.getByRole('button', { name: '스토리 옵션 더보기' }).click();
    await page.getByRole('menuitem', { name: '삭제하기' }).click();

    const dialog = page.getByRole('alertdialog');

    await expect(dialog.getByText('스토리를 삭제할까요?')).toBeVisible();
    await dialog.getByRole('button', { name: '삭제하기' }).click();

    await expect(page.getByText('스토리를 삭제했어요')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('로드에 실패하면 다시 시도로 복구한다 (US-4-4)', async ({ page }) => {
    let callCount = 0;

    await page.route(STORY_DETAIL, async (route) => {
      callCount += 1;

      if (callCount === 1) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: '{}',
        });

        return;
      }

      await fulfillStoryDetail(route);
    });

    await page.goto('/stories/s1');

    await expect(page.getByText('스토리를 불러오지 못했어요')).toBeVisible();
    await page.getByRole('button', { name: '다시 시도' }).click();

    await expect(
      page.getByRole('heading', { level: 1, name: '용의 계곡' }),
    ).toBeVisible();
  });
});
