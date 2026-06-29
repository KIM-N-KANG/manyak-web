import { expect, seedChatIds, test } from '../fixtures/test';

// 채팅 목록은 localStorage의 ID로 POST /api/v1/chats/batch 를 호출해 카드를 그린다.
// toChatListItems가 필수 필드(id·storyId·storyTitle·lastStoryPreview·updatedAt)를 모두 갖춘 항목만 남기므로
// 모킹 응답도 해당 필드를 모두 채운다.
const CHATS_BATCH = '**/api/v1/chats/batch';

const chat = (id: string, storyTitle: string) => ({
  id,
  storyId: `story-${id}`,
  storyTitle,
  lastStoryPreview: '이야기 미리보기입니다',
  chatCount: 3,
  updatedAt: '2026-06-01T00:00:00Z',
});

test.describe('채팅 목록', () => {
  test('보관한 ID로 진행 중인 채팅 목록을 보여준다 (US-5-1)', async ({
    page,
  }) => {
    await seedChatIds(page, ['c1', 'c2']);
    await page.route(CHATS_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          chat('c1', '용의 계곡'),
          chat('c2', '별빛 항해'),
        ]),
      });
    });

    await page.goto('/chats');

    await expect(page.getByText('용의 계곡', { exact: true })).toBeVisible();
    await expect(page.getByText('별빛 항해', { exact: true })).toBeVisible();
  });

  test('채팅을 누르면 채팅방으로 이어간다 (US-5-2)', async ({ page }) => {
    await seedChatIds(page, ['c1']);
    await page.route(CHATS_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([chat('c1', '용의 계곡')]),
      });
    });

    await page.goto('/chats');
    await page.getByRole('link', { name: '용의 계곡 채팅 보기' }).click();

    await expect(page).toHaveURL(/\/chats\/c1$/);
  });

  test('채팅을 삭제하면 완료 안내가 뜬다 (US-5-3)', async ({ page }) => {
    await seedChatIds(page, ['c1']);
    await page.route(CHATS_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([chat('c1', '용의 계곡')]),
      });
    });
    await page.route('**/api/v1/chats/c1', async (route) => {
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/chats');
    await page.getByRole('button', { name: '채팅 옵션 더보기' }).click();
    await page.getByRole('menuitem', { name: '삭제하기' }).click();

    const dialog = page.getByRole('alertdialog');

    await expect(dialog.getByText('채팅을 삭제할까요?')).toBeVisible();
    await dialog.getByRole('button', { name: '삭제하기' }).click();

    await expect(page.getByText('채팅을 삭제했어요')).toBeVisible();
  });
});
