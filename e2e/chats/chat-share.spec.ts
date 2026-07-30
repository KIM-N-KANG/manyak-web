import { TOAST_MESSAGE } from '@/constants/toast-message';

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
  test('헤더 공유 버튼 → 확인 다이얼로그를 거쳐 발급 후 링크가 클립보드에 복사된다', async ({
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
    await page
      .getByRole('banner')
      .getByRole('button', { name: '채팅 공유하기 버튼' })
      .click();

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByRole('heading', { name: '이 채팅을 공유할까요?' }),
    ).toBeVisible();
    await expect(dialog).toContainText(
      '이 링크가 있으면 누구든지 내가 지금까지 이어온 채팅을 볼 수 있어요',
    );

    await dialog.getByRole('button', { name: '링크 복사하기' }).click();

    await createRequest;
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { __copiedUrl?: string }).__copiedUrl,
        ),
      )
      .toContain('/share/share-1');
    await expect(
      page.getByText(TOAST_MESSAGE.CHAT_SHARE_LINK_COPIED),
    ).toBeVisible();
  });

  test('나중에 하기를 누르면 발급 없이 다이얼로그만 닫힌다', async ({
    page,
  }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail),
      });
    });

    let createRequested = false;

    await page.route('**/api/v1/chats/c1/shares', (route) => {
      createRequested = true;

      return route.fulfill({ json: { shareId: 'share-1' }, status: 201 });
    });

    await page.goto('/chats/c1');
    await page
      .getByRole('banner')
      .getByRole('button', { name: '채팅 공유하기 버튼' })
      .click();

    const dialog = page.getByRole('dialog');

    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: '나중에 하기' }).click();

    await expect(dialog).toHaveCount(0);
    expect(createRequested).toBe(false);
  });
});
