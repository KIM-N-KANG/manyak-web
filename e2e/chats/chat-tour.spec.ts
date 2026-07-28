import { expect, skipChatTour, test } from '../fixtures/test';

// 채팅 화면 안내 투어(KNK-694): 턴 0개 첫 진입 시 자동 노출, 헤더 메뉴로 재열람.
const CHAT_DETAIL = '**/api/v1/chats/c1';

const chatDetail = () => ({
  id: 'c1',
  storyId: 's1',
  storyTitle: '용의 계곡',
  prologue: '안개 낀 계곡 앞에 한 용사가 섰다.',
  turns: [],
  suggestedInputs: ['던전에 진입한다', '주변을 둘러본다', '용에게 말을 건다'],
});

test.describe('채팅 화면 안내 투어', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });
  });

  test('첫 진입 시 투어가 자동 노출되고 3스텝을 완주할 수 있다', async ({
    page,
  }) => {
    await page.goto('/chats/c1');

    const tour = page.getByRole('dialog', { name: '채팅 화면 안내' });

    await expect(tour).toBeVisible();
    await expect(tour.getByText('상황·대사 추가')).toBeVisible();

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
