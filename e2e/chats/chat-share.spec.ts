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
  test('더보기에서 공유 링크 복사를 누르면 발급 후 링크가 클립보드에 복사된다', async ({
    page,
  }) => {
    // 헤드리스 환경의 클립보드 권한 문제를 피하려고 writeText를 스텁해 복사된 값을 검사한다.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (text: string) => {
            (window as unknown as { __copiedUrl?: string }).__copiedUrl = text;

            return Promise.resolve();
          },
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
    await page.getByRole('menuitem', { name: '공유 링크 복사' }).click();

    await createRequest;
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { __copiedUrl?: string }).__copiedUrl,
        ),
      )
      .toContain('/share/share-1');
    await expect(page.getByText('공유 링크를 복사했어요')).toBeVisible();
  });
});
