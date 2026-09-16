import { TOAST_MESSAGE } from '@/constants/toast-message';
import { CHAT_MENU_COPY } from '@/features/chats/room/constants';

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
  test('헤더 메뉴 드로어의 채팅 공유를 누르면 바로 발급 후 링크가 클립보드에 복사된다', async ({
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
      .getByRole('button', { name: CHAT_MENU_COPY.trigger })
      .click();

    const drawer = page.getByRole('dialog', { name: CHAT_MENU_COPY.title });

    await drawer.getByRole('button', { name: CHAT_MENU_COPY.share }).click();

    await createRequest;
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
    await expect(drawer).toBeHidden();
  });

  test('발급이 실패하면 실패 토스트를 띄우고 드로어는 유지한다', async ({
    page,
  }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail),
      });
    });
    await page.route('**/api/v1/chats/c1/shares', (route) =>
      route.fulfill({ status: 500, body: '' }),
    );

    await page.goto('/chats/c1');
    await page
      .getByRole('banner')
      .getByRole('button', { name: CHAT_MENU_COPY.trigger })
      .click();

    const drawer = page.getByRole('dialog', { name: CHAT_MENU_COPY.title });

    await drawer.getByRole('button', { name: CHAT_MENU_COPY.share }).click();

    await expect(page.getByText(TOAST_MESSAGE.CHAT_SHARE_FAILED)).toBeVisible();
    await expect(drawer).toBeVisible();
  });
});
