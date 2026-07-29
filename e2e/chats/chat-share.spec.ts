import {
  expect,
  mockChatShareCreate,
  skipChatTour,
  test,
} from '../fixtures/test';

// 발급: POST /api/v1/chats/{chatId}/shares → 201 { shareId }.
const CHAT_DETAIL = '**/api/v1/chats/c1';

const chatDetail = {
  id: 'c1',
  storyId: 's1',
  storyTitle: '용의 계곡',
  prologue: '안개 낀 계곡 앞에 한 용사가 섰다.',
  turns: [],
  suggestedInputs: ['던전에 진입한다'],
};

test.beforeEach(async ({ page }) => {
  await skipChatTour(page);
});

test.describe('채팅 공유 발급', () => {
  test('더보기에서 공유하면 발급 요청이 나가고 공유 시트가 열린다', async ({
    page,
  }) => {
    // 헤드리스 크로뮴에는 navigator.share가 없으므로 스텁을 심어 호출 인자를 검사한다.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (data: { url: string }) => {
          (window as unknown as { __sharedUrl?: string }).__sharedUrl =
            data.url;

          return Promise.resolve();
        },
      });
    });

    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail),
      });
    });
    await mockChatShareCreate(page, 'share-1');

    const createRequest = page.waitForRequest(
      (request) =>
        request.method() === 'POST' &&
        /\/chats\/c1\/shares$/.test(request.url()),
    );

    await page.goto('/chats/c1');
    await page.getByRole('button', { name: '채팅 옵션 더보기' }).click();
    await page.getByRole('menuitem', { name: '공유하기' }).click();

    await createRequest;
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { __sharedUrl?: string }).__sharedUrl,
        ),
      )
      .toContain('/shares/share-1');
  });
});
