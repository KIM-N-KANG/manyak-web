import {
  expect,
  seedChatIds,
  seedStoryIds,
  skipOnboarding,
  test,
} from '../fixtures/test';

// 채팅 목록은 localStorage의 ID로 POST /api/v1/chats/batch 를 호출해 카드를 그린다.
// toChatListItems가 필수 필드(id·storyId·storyTitle·lastStoryPreview·updatedAt)를 모두 갖춘 항목만 남기므로
// 모킹 응답도 해당 필드를 모두 채운다.
const CHATS_BATCH = '**/api/v1/chats/batch';

const chat = (id: string, storyTitle: string) => ({
  id,
  storyId: `story-${id}`,
  storyTitle,
  lastStoryPreview: '이야기 미리보기입니다',
  turnCount: 3,
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

  test('채팅을 누르면 채팅 화면으로 이어간다 (US-5-2)', async ({ page }) => {
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

  test('진행 중인 채팅도 스토리도 없으면 스토리 만들기를 안내한다 (US-5-4)', async ({
    page,
  }) => {
    // 채팅 ID를 심지 않으면 목록이 비어 있고, 온보딩을 건너뛰어 다이얼로그가 뜨지 않게 한다.
    await skipOnboarding(page);

    await page.goto('/chats');

    await expect(page.getByText('아직 진행중인 채팅이 없어요')).toBeVisible();

    // base-ui Button(render=Link)은 role="button"인 앵커라 button 역할로 잡힌다.
    const link = page.getByRole('button', { name: '스토리 만들기' });

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/stories/new');
  });

  test('진행 중인 채팅은 없지만 스토리가 있으면 스토리 목록으로 안내한다 (US-5-4)', async ({
    page,
  }) => {
    // 스토리 ID를 심으면 채팅이 없어도 온보딩 게이팅을 통과하고, 안내가 스토리 목록 이동으로 분기된다.
    await seedStoryIds(page, ['s1']);

    await page.goto('/chats');

    await expect(page.getByText('아직 진행중인 채팅이 없어요')).toBeVisible();

    // base-ui Button(render=Link)은 role="button"인 앵커라 button 역할로 잡힌다.
    const link = page.getByRole('button', { name: '스토리 목록으로 가기' });

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/');
  });
});
