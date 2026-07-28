import { expect, skipChatTour, test } from '../fixtures/test';

// 채팅 화면 안내 투어(KNK-694): 턴 0개 첫 진입 시 자동 노출, 헤더 메뉴로 재열람.
const CHAT_DETAIL = '**/api/v1/chats/c1';

const chatDetail = (prologue = '안개 낀 계곡 앞에 한 용사가 섰다.') => ({
  id: 'c1',
  storyId: 's1',
  storyTitle: '용의 계곡',
  prologue,
  turns: [],
  suggestedInputs: ['던전에 진입한다', '주변을 둘러본다', '용에게 말을 건다'],
});

// 추천 입력이 화면 밖으로 밀려나도록 프롤로그를 길게 만든다.
const longPrologue = Array.from(
  { length: 30 },
  (_, index) => `${index + 1}번째 문단이다. 안개가 짙게 깔린 계곡을 지나간다.`,
).join('\n\n');

const routeChatDetail = async (
  page: Parameters<typeof skipChatTour>[0],
  prologue?: string,
) => {
  await page.route(CHAT_DETAIL, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(chatDetail(prologue)),
    });
  });
};

test.describe('채팅 화면 안내 투어', () => {
  test.beforeEach(async ({ page }) => {
    await routeChatDetail(page);
  });

  test('첫 진입 시 투어가 자동 노출되고 4스텝을 완주할 수 있다', async ({
    page,
  }) => {
    await page.goto('/chats/c1');

    const tour = page.getByRole('dialog', { name: '채팅 화면 안내' });

    await expect(tour).toBeVisible();
    await expect(tour.getByText('추천 입력', { exact: true })).toBeVisible();

    await tour.getByRole('button', { name: '다음' }).click();
    await expect(tour.getByText('상황·대사 입력')).toBeVisible();

    await tour.getByRole('button', { name: '다음' }).click();
    await expect(tour.getByText('입력 설정')).toBeVisible();

    await tour.getByRole('button', { name: '다음' }).click();
    await expect(tour.getByText('랜덤 전송')).toBeVisible();

    await tour.getByRole('button', { name: '완료' }).click();
    await expect(tour).toBeHidden();
  });

  test('건너뛰면 닫히고 재진입 시 다시 뜨지 않는다', async ({ page }) => {
    await page.goto('/chats/c1');

    const tour = page.getByRole('dialog', { name: '채팅 화면 안내' });

    await expect(tour).toBeVisible();
    await tour.getByRole('button', { name: '건너뛰기' }).click();
    await expect(tour).toBeHidden();

    await page.reload();
    await expect(
      page.getByText('안개 낀 계곡 앞에 한 용사가 섰다.'),
    ).toBeVisible();
    await expect(tour).toBeHidden();
  });

  test('프롤로그가 길어 추천 입력이 화면 밖이면 스크롤해서 보여준다', async ({
    page,
  }) => {
    await routeChatDetail(page, longPrologue);
    await page.goto('/chats/c1');

    const tour = page.getByRole('dialog', { name: '채팅 화면 안내' });

    await expect(tour).toBeVisible();
    await expect(tour.getByText('추천 입력', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: '던전에 진입한다' }),
    ).toBeInViewport();
  });

  test('헤더 옵션 메뉴에서 투어를 다시 볼 수 있다', async ({ page }) => {
    await skipChatTour(page);
    await page.goto('/chats/c1');

    await expect(
      page.getByText('안개 낀 계곡 앞에 한 용사가 섰다.'),
    ).toBeVisible();

    await page.getByRole('button', { name: '채팅 옵션 더보기' }).click();
    await page.getByRole('menuitem', { name: '화면 안내 다시 보기' }).click();

    await expect(
      page.getByRole('dialog', { name: '채팅 화면 안내' }),
    ).toBeVisible();
  });
});
