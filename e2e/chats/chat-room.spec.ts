import { type Page } from '@playwright/test';

import { DEFAULT_TITLE } from '@/constants/site';

import { mockMemberSession } from '../fixtures/auth';
import {
  expect,
  seedChatIds,
  skipChatTour,
  skipOnboarding,
  test,
} from '../fixtures/test';

// 채팅 화면(/chats/[id])은 (chat) 레이아웃이라 온보딩 게이팅이 없다.
// 상세: GET /api/v1/chats/{id}, 이어쓰기: POST /api/v1/chats/{id}/turns/stream (text/event-stream).
// SSE 포맷: started → (token | character_image)×N → completed | error
const CHAT_DETAIL = '**/api/v1/chats/c1';
const CHAT_STREAM = '**/api/v1/chats/c1/turns/stream';
const CHAT_REGENERATE = '**/api/v1/chats/c1/turns/regenerate/stream';
const CHAT_CHOICES = '**/api/v1/chats/c1/turns/1/choices';
const PLAY_FILLED_PATH =
  'M21.4086 9.35258C23.5305 10.5065 23.5305 13.4935 21.4086 14.6474';
const CHARACTER_IMAGE_URL =
  'https://dev-cdn.manyak.app/characters/generated/serin.webp';

// 1x1 투명 PNG. 인물 이미지 요청이 외부 네트워크로 나가지 않도록 목킹에 쓴다.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// 기본 모드가 블럭 입력이므로, textarea 기반 테스트는 일반 모드를 고정한다.
const setPlainInputMode = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('manyak:chat-input-mode', 'plain');
  });
};

const chatDetail = (
  turns: unknown[] = [],
  suggestedInputs: string[] = ['던전에 진입한다', '주변을 둘러본다'],
) => ({
  id: 'c1',
  storyId: 's1',
  storyTitle: '용의 계곡',
  prologue: '안개 낀 계곡 앞에 한 용사가 섰다.',
  turns,
  suggestedInputs,
});

const sse = (events: string[]) => events.join('');

// 첫 진입 안내 투어는 별도 스펙(chat-tour)에서 다루므로 여기서는 노출을 막는다.
test.beforeEach(async ({ page }) => {
  await skipChatTour(page);
});

test.describe('채팅 스트리밍', () => {
  test('프롤로그와 추천 입력을 보여준다 (US-6-1)', async ({ page }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });

    await page.goto('/chats/c1');

    await expect(
      page.getByText('안개 낀 계곡 앞에 한 용사가 섰다.'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '던전에 진입한다' }),
    ).toBeVisible();
  });

  test('브라우저 탭 제목이 스토리 제목 - 마냑이 된다', async ({ page }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });

    await page.goto('/chats/c1');

    await expect(page).toHaveTitle('용의 계곡 - 마냑');

    // 탭 제목을 클라이언트에서 덮어쓰므로, 화면을 벗어나면 원래대로 돌아오는지도 본다.
    await page
      .getByRole('button', { name: '채팅 목록으로 돌아가기 버튼' })
      .click();

    await expect(page).toHaveTitle(DEFAULT_TITLE);
  });

  test('빈 입력의 Play 버튼이 추천 입력을 랜덤 전송한다', async ({ page }) => {
    const completedTurn = {
      id: 1,
      userInput: '던전에 진입한다',
      aiOutput: '문이 서서히 열린다.',
      choices: [],
      createdAt: '2026-06-01T00:00:00Z',
    };
    let detailCallCount = 0;

    await page.route(CHAT_DETAIL, async (route) => {
      detailCallCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          detailCallCount === 1
            ? chatDetail([], ['던전에 진입한다'])
            : chatDetail([completedTurn]),
        ),
      });
    });
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          'event: started\ndata: {}\n\n',
          'event: token\ndata: {"text":"문이 서서히 열린다."}\n\n',
          'event: completed\ndata: {"aiOutput":"문이 서서히 열린다."}\n\n',
        ]),
      });
    });

    await page.goto('/chats/c1');

    const randomSendButton = page.getByRole('button', {
      name: '추천 입력 랜덤 전송',
    });

    await expect(randomSendButton).toBeEnabled();
    await expect(randomSendButton.locator('path')).toHaveAttribute(
      'd',
      new RegExp(`^${PLAY_FILLED_PATH}`),
    );
    await randomSendButton.click();
    await expect(page.getByText('던전에 진입한다')).toBeVisible();
  });

  test('입력과 추천이 모두 없으면 Play 버튼이 비활성화되고 입력하면 전송 상태가 된다', async ({
    page,
  }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail([], [])),
      });
    });

    await setPlainInputMode(page);
    await page.goto('/chats/c1');

    const randomSendButton = page.getByRole('button', {
      name: '추천 입력 랜덤 전송',
    });

    await expect(randomSendButton).toBeDisabled();
    await expect(randomSendButton.locator('path')).toHaveAttribute(
      'd',
      new RegExp(`^${PLAY_FILLED_PATH}`),
    );

    await page
      .getByPlaceholder('이야기를 어떻게 이어갈까요?')
      .fill('직접 입력한다');
    await expect(page.getByRole('button', { name: '전송' })).toBeEnabled();
  });

  test('응답을 받는 동안 전송 버튼에 스피너가 보인다', async ({ page }) => {
    const completedTurn = {
      id: 1,
      userInput: '앞으로 나아간다',
      aiOutput: '문이 열린다.',
      choices: [],
      createdAt: '2026-06-01T00:00:00Z',
    };
    let detailCallCount = 0;

    await page.route(CHAT_DETAIL, async (route) => {
      detailCallCount += 1;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          detailCallCount === 1 ? chatDetail() : chatDetail([completedTurn]),
        ),
      });
    });
    // 스트림 응답을 늦춰 "받는 중" 상태를 관찰할 시간을 만든다.
    await page.route(CHAT_STREAM, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          'event: started\ndata: {}\n\n',
          'event: completed\ndata: {"aiOutput":"문이 열린다."}\n\n',
        ]),
      });
    });

    await setPlainInputMode(page);
    await page.goto('/chats/c1');
    await page
      .getByPlaceholder('이야기를 어떻게 이어갈까요?')
      .fill('앞으로 나아간다');

    // 전송 후에는 입력이 비워져 버튼 라벨이 바뀌므로 속성으로 스코프한다.
    const sendButton = page.locator('[data-tour="send"]');

    await page.getByRole('button', { name: '전송', exact: true }).click();

    await expect(
      sendButton.getByRole('status', { name: '응답을 받는 중' }),
    ).toBeVisible();
    await expect(sendButton).toBeDisabled();

    await expect(page.getByText('문이 열린다.')).toBeVisible();
    await expect(
      sendButton.getByRole('status', { name: '응답을 받는 중' }),
    ).toBeHidden();
  });

  test('메시지를 전송하면 응답이 스트리밍되어 누적된다 (US-6-2·6-3)', async ({
    page,
  }) => {
    const completedTurn = {
      id: 1,
      userInput: '앞으로 나아간다',
      aiOutput: '어둠이 너를 삼킨다.',
      choices: [],
      createdAt: '2026-06-01T00:00:00Z',
    };

    let detailCallCount = 0;

    await page.route(CHAT_DETAIL, async (route) => {
      detailCallCount += 1;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          detailCallCount === 1 ? chatDetail() : chatDetail([completedTurn]),
        ),
      });
    });
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          'event: started\ndata: {}\n\n',
          'event: token\ndata: {"text":"어둠이 "}\n\n',
          'event: token\ndata: {"text":"너를 "}\n\n',
          'event: token\ndata: {"text":"삼킨다."}\n\n',
          'event: completed\ndata: {"aiOutput":"어둠이 너를 삼킨다."}\n\n',
        ]),
      });
    });

    const pixelLogs: string[] = [];

    page.on('console', (msg) => {
      if (msg.text().includes('[meta-pixel]')) {
        pixelLogs.push(msg.text());
      }
    });

    await setPlainInputMode(page);
    await page.goto('/chats/c1');
    await page
      .getByPlaceholder('이야기를 어떻게 이어갈까요?')
      .fill('앞으로 나아간다');
    await page.getByRole('button', { name: '전송' }).click();

    await expect(page.getByText('앞으로 나아간다')).toBeVisible();
    await expect(page.getByText('어둠이 너를 삼킨다.')).toBeVisible();

    // 첫 턴 스트림 정상 완료 = Meta StartTrial 발화(비활성 환경에서는 디버그 로그로 대체).
    await expect
      .poll(() => pixelLogs.filter((log) => log.includes('StartTrial')).length)
      .toBe(1);
  });

  test('인물 이미지를 completed 전에 표시하고 확정 마커로 이어서 복원한다 (US-6-11)', async ({
    page,
  }) => {
    const confirmedOutput =
      `*문이 열린다.*\n[[세린:${CHARACTER_IMAGE_URL}]]\n\n` + '세린: 기다렸어?';
    const completedTurn = {
      id: 1,
      userInput: '문 안으로 들어간다',
      aiOutput: confirmedOutput,
      choices: [],
      createdAt: '2026-06-01T00:00:00Z',
    };
    let detailCallCount = 0;

    await page.route(CHAT_DETAIL, async (route) => {
      detailCallCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          detailCallCount === 1 ? chatDetail() : chatDetail([completedTurn]),
        ),
      });
    });
    await page.route('**/_next/image**', async (route) => {
      await route.fulfill({ contentType: 'image/png', body: TINY_PNG });
    });

    // Playwright route.fulfill은 응답 본문을 한 번에 전달하므로, 브라우저 fetch를
    // ReadableStream으로 바꿔 이미지 이벤트와 completed 사이의 실제 화면을 관찰한다.
    await page.addInitScript(
      ({ imageUrl, confirmed }) => {
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
          const input = args[0];
          const url = input instanceof Request ? input.url : input.toString();

          if (!url.endsWith('/api/v1/chats/c1/turns/stream')) {
            return originalFetch(...args);
          }

          const encoder = new TextEncoder();
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              document.documentElement.dataset.chatStreamCompleted = 'false';
              controller.enqueue(
                encoder.encode(
                  'event: started\ndata: {}\n\n' +
                    'event: token\ndata: {"text":"*문이 열린다.*\\n"}\n\n' +
                    `event: character_image\ndata: ${JSON.stringify({ name: '세린', imageUrl })}\n\n` +
                    'event: token\ndata: {"text":"세린: 기다렸어?"}\n\n',
                ),
              );

              window.setTimeout(() => {
                document.documentElement.dataset.chatStreamCompleted = 'true';
                controller.enqueue(
                  encoder.encode(
                    `event: completed\ndata: ${JSON.stringify({ aiOutput: confirmed })}\n\n`,
                  ),
                );
                controller.close();
              }, 1000);
            },
          });

          return new Response(stream, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          });
        };
      },
      { imageUrl: CHARACTER_IMAGE_URL, confirmed: confirmedOutput },
    );

    await setPlainInputMode(page);
    await page.goto('/chats/c1');
    await page
      .getByPlaceholder('이야기를 어떻게 이어갈까요?')
      .fill('문 안으로 들어간다');
    await page.getByRole('button', { name: '전송' }).click();

    const image = page.getByRole('img', { name: '세린 인물 이미지' });
    const imageBlock = page.locator('[data-slot="chat-character-image"]');
    const aiMessageContent = imageBlock.locator('..');
    const aiMessage = imageBlock.locator(
      'xpath=ancestor::*[@data-slot="message-content"]',
    );
    const characterLine = page
      .getByText('세린: 기다렸어?')
      .locator('xpath=ancestor::p');

    await expect(image).toBeVisible();
    await expect(page.getByText('세린: 기다렸어?')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute(
      'data-chat-stream-completed',
      'false',
    );

    await expect(aiMessage).toHaveCSS('padding-left', '0px');
    await expect(characterLine).toHaveCSS('padding-left', '16px');
    await expect(aiMessageContent).toHaveCSS('row-gap', '16px');
    await expect(imageBlock).toHaveCSS('border-top-width', '1px');
    await expect(imageBlock).toHaveCSS('border-bottom-width', '1px');
    await expect(imageBlock).toHaveCSS('border-left-width', '0px');
    await expect(imageBlock).toHaveCSS('border-right-width', '0px');

    const imageBox = await imageBlock.boundingBox();
    const messageBox = await aiMessage.boundingBox();

    expect(imageBox).not.toBeNull();
    expect(messageBox).not.toBeNull();
    expect(Math.abs(imageBox!.x - messageBox!.x)).toBeLessThan(1);
    expect(Math.abs(imageBox!.width - messageBox!.width)).toBeLessThan(1);
    expect(imageBox!.width / imageBox!.height).toBeCloseTo(4 / 3, 1);

    await expect(page.locator('html')).toHaveAttribute(
      'data-chat-stream-completed',
      'true',
    );
    await expect.poll(() => detailCallCount).toBeGreaterThanOrEqual(2);
    await expect(image).toBeVisible();
    await expect(page.locator('body')).not.toContainText('[[세린:');
  });

  test('추천 입력의 수정 버튼을 누르면 입력창에 채워진다 (US-6-4)', async ({
    page,
  }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });

    await setPlainInputMode(page);
    await page.goto('/chats/c1');
    // 첫 번째 추천 입력의 "입력창에 넣어 수정" 버튼을 누르면 전송하지 않고 입력창에만 채운다.
    await page
      .getByRole('button', { name: '입력창에 넣어 수정' })
      .first()
      .click();

    await expect(
      page.getByPlaceholder('이야기를 어떻게 이어갈까요?'),
    ).toHaveValue('던전에 진입한다');
  });

  test('추천 입력 본문을 누르면 바로 전송된다 (US-6-4)', async ({ page }) => {
    const completedTurn = {
      id: 1,
      userInput: '던전에 진입한다',
      aiOutput: '문이 서서히 열린다.',
      choices: [],
      createdAt: '2026-06-01T00:00:00Z',
    };

    let detailCallCount = 0;

    await page.route(CHAT_DETAIL, async (route) => {
      detailCallCount += 1;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          detailCallCount === 1 ? chatDetail() : chatDetail([completedTurn]),
        ),
      });
    });
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          'event: started\ndata: {}\n\n',
          'event: token\ndata: {"text":"문이 "}\n\n',
          'event: token\ndata: {"text":"서서히 "}\n\n',
          'event: token\ndata: {"text":"열린다."}\n\n',
          'event: completed\ndata: {"aiOutput":"문이 서서히 열린다."}\n\n',
        ]),
      });
    });

    await page.goto('/chats/c1');
    await page.getByRole('button', { name: '던전에 진입한다' }).click();

    await expect(page.getByText('던전에 진입한다')).toBeVisible();
    await expect(page.getByText('문이 서서히 열린다.')).toBeVisible();
  });

  test('스트리밍이 실패하면 오류 안내가 뜬다 (US-6-8)', async ({ page }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail([], [])),
      });
    });
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          'event: started\ndata: {}\n\n',
          'event: error\ndata: {"message":"실패"}\n\n',
        ]),
      });
    });

    const pixelLogs: string[] = [];

    page.on('console', (msg) => {
      if (msg.text().includes('[meta-pixel]')) {
        pixelLogs.push(msg.text());
      }
    });

    await setPlainInputMode(page);
    await page.goto('/chats/c1');
    await page.getByPlaceholder('이야기를 어떻게 이어갈까요?').fill('계속한다');
    await page.getByRole('button', { name: '전송' }).click();

    await expect(page.getByText('응답 생성에 실패했어요')).toBeVisible();
    // 실패로 스트리밍이 끝나도 전송 버튼이 스피너에 머물지 않아야 한다.
    await expect(
      page.locator('[data-tour="send"]').getByRole('status'),
    ).toBeHidden();

    // 스트림 실패 시 Meta StartTrial은 발화되지 않아야 한다.
    expect(pixelLogs.filter((log) => log.includes('StartTrial'))).toHaveLength(
      0,
    );
  });

  test('completed·error 없이 스트림이 끝나면 실패로 처리하고 저장된 턴을 반영한다', async ({
    page,
  }) => {
    // 백엔드 SSE 전체 상한(120초) 초과는 error 이벤트 없이 스트림을 닫는다. 그때 서버는 턴을
    // 저장했을 수 있으므로, 프론트는 상태를 풀고 상세를 다시 조회해 확정본을 보여줘야 한다.
    const persistedTurn = {
      id: 1,
      userInput: '계속한다',
      aiOutput: '문이 서서히 열린다.',
      choices: [],
      createdAt: '2026-06-01T00:00:00Z',
    };
    let detailCallCount = 0;

    await page.route(CHAT_DETAIL, async (route) => {
      detailCallCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          detailCallCount === 1
            ? chatDetail([], [])
            : chatDetail([persistedTurn]),
        ),
      });
    });
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          'event: started\ndata: {}\n\n',
          'event: token\ndata: {"text":"문이 서서히 "}\n\n',
        ]),
      });
    });

    await setPlainInputMode(page);
    await page.goto('/chats/c1');
    await page.getByPlaceholder('이야기를 어떻게 이어갈까요?').fill('계속한다');
    await page.getByRole('button', { name: '전송' }).click();

    await expect(page.getByText('응답 생성에 실패했어요')).toBeVisible();
    // 스트리밍 상태가 풀려야 한다 — 이 처리가 없으면 스피너가 영구히 남는다(G5).
    await expect(
      page.locator('[data-tour="send"]').getByRole('status'),
    ).toBeHidden();
    // 재조회로 서버가 저장한 턴이 화면에 나타나야 한다.
    await expect(page.getByText('문이 서서히 열린다.')).toBeVisible();
  });
});

test.describe('채팅 헤더', () => {
  test('스크롤해도 헤더는 상단에 고정되어 계속 보인다', async ({ page }) => {
    // 스크롤이 생기도록 충분히 긴 대화 이력을 만든다.
    const longTurns = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      userInput: `사용자 입력 ${i + 1}`,
      aiOutput: `AI 응답 ${i + 1}: ` + '긴 이야기가 이어진다. '.repeat(20),
      choices: [],
      createdAt: '2026-06-01T00:00:00Z',
    }));

    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail(longTurns)),
      });
    });

    await page.goto('/chats/c1');

    const header = page.getByRole('banner');
    const viewport = page.locator('[data-slot="message-scroller-viewport"]');
    const scrollTop = () => viewport.evaluate((el) => el.scrollTop);

    await expect(page.getByText('AI 응답 10', { exact: false })).toBeVisible();
    await expect(header.getByText('용의 계곡')).toBeVisible();

    // 최하단에서 시작하므로 위로 올렸다가 다시 아래로 내려도 헤더가 유지되는지 본다.
    await page.mouse.move(200, 300);

    const initialTop = await scrollTop();

    await page.mouse.wheel(0, -300);
    await expect.poll(scrollTop).toBeLessThan(initialTop);
    await page.mouse.wheel(0, 150);

    await expect(header.getByText('용의 계곡')).toBeVisible();
  });
});

test.describe('채팅 삭제', () => {
  // 삭제 항목은 헤더 우측 옵션 드랍다운 메뉴 안에 있다.
  // 같은 URL을 GET(상세 조회)/DELETE(삭제)로 함께 쓰므로 메서드로 분기해 모킹한다.
  const openDeleteDialog = async (page: Page) => {
    await page.getByRole('button', { name: '채팅 옵션 더보기' }).click();
    await page.getByRole('menuitem', { name: '삭제하기' }).click();

    return page.getByRole('alertdialog');
  };

  test('옵션 메뉴에서 채팅을 삭제하면 완료 안내가 뜨고 목록으로 돌아간다 (US-5-3)', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await seedChatIds(page, ['c1']);
    await page.route(CHAT_DETAIL, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204, body: '' });

        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });

    await page.goto('/chats/c1');

    const dialog = await openDeleteDialog(page);

    await expect(dialog.getByText('채팅을 삭제할까요?')).toBeVisible();
    await dialog.getByRole('button', { name: '삭제하기' }).click();

    await expect(page.getByText('채팅이 삭제되었어요')).toBeVisible();
    await expect(page).toHaveURL(/\/chats$/);
  });

  test('로그인 상태에서 채팅을 삭제하면 목록에서 사라진다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);

    let deleted = false;

    await page.route(CHAT_DETAIL, async (route) => {
      if (route.request().method() === 'DELETE') {
        deleted = true;
        await route.fulfill({ status: 204, body: '' });

        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });
    await page.route('**/api/v1/users/me/chats**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          deleted
            ? []
            : [
                {
                  id: 'c1',
                  storyId: 's1',
                  storyTitle: '용의 계곡',
                  lastStoryPreview: '이야기 미리보기입니다',
                  turnCount: 3,
                  updatedAt: '2026-06-01T00:00:00Z',
                },
              ],
        ),
      });
    });

    await page.goto('/chats/c1');

    const dialog = await openDeleteDialog(page);

    await dialog.getByRole('button', { name: '삭제하기' }).click();

    await expect(page.getByText('채팅이 삭제되었어요')).toBeVisible();
    await expect(page).toHaveURL(/\/chats$/);
    await expect(page.getByText('아직 진행중인 채팅이 없어요')).toBeVisible();
  });
});

test.describe('블럭 입력 모드 (기본)', () => {
  test('묘사 블럭과 대사 블럭이 기본으로 하나씩 보인다', async ({ page }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });

    await page.goto('/chats/c1');

    await expect(
      page.getByPlaceholder('어떤 상황을 묘사할까요?'),
    ).toBeVisible();
    await expect(page.getByPlaceholder('어떤 대사를 건넬까요?')).toBeVisible();

    const inputActions = page
      .getByRole('button', { name: '상황 묘사 추가' })
      .locator('..');

    await expect(inputActions).toHaveCSS('padding-top', '0px');
  });

  test('입력 모드 메뉴에서 일반 입력을 선택하면 입력창이 전환된다 (US-6-16)', async ({
    page,
  }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });

    await page.goto('/chats/c1');

    await page.getByRole('button', { name: '입력 모드 변경' }).click();
    await page.getByRole('menuitemradio', { name: /일반 입력/ }).click();

    await expect(
      page.getByPlaceholder('이야기를 어떻게 이어갈까요?'),
    ).toBeVisible();
    await expect(page.getByPlaceholder('어떤 상황을 묘사할까요?')).toBeHidden();
  });

  test('기본 상황·대사 블럭을 채워 전송하면 하나의 메시지로 직렬화된다', async ({
    page,
  }) => {
    const completedTurn = {
      id: 1,
      userInput: '*비가 온다* 우산 챙겼어?',
      aiOutput: '그녀가 고개를 끄덕였다.',
      choices: [],
      createdAt: '2026-06-01T00:00:00Z',
    };

    let detailCallCount = 0;
    let streamRequestBody = '';

    await page.route(CHAT_DETAIL, async (route) => {
      detailCallCount += 1;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          detailCallCount === 1 ? chatDetail() : chatDetail([completedTurn]),
        ),
      });
    });
    await page.route(CHAT_STREAM, async (route) => {
      streamRequestBody = route.request().postData() ?? '';

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          'event: started\ndata: {}\n\n',
          'event: token\ndata: {"text":"그녀가 고개를 끄덕였다."}\n\n',
          'event: completed\ndata: {"aiOutput":"그녀가 고개를 끄덕였다."}\n\n',
        ]),
      });
    });

    await page.goto('/chats/c1');

    await page.getByPlaceholder('어떤 상황을 묘사할까요?').fill('비가 온다');
    await page.getByPlaceholder('어떤 대사를 건넬까요?').fill('우산 챙겼어?');
    await page.getByRole('button', { name: '전송' }).click();

    await expect(page.getByText('그녀가 고개를 끄덕였다.')).toBeVisible();
    expect(JSON.parse(streamRequestBody)).toEqual({
      userInput: '*비가 온다*\n\n우산 챙겼어?',
      userSource: 'typed',
    });
  });

  test('X 버튼을 누르면 해당 블럭 인풋이 사라진다', async ({ page }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });

    await page.goto('/chats/c1');

    await expect(
      page.getByPlaceholder('어떤 상황을 묘사할까요?'),
    ).toBeVisible();

    await page.getByRole('button', { name: '입력 삭제' }).first().click();
    await expect(page.getByPlaceholder('어떤 상황을 묘사할까요?')).toBeHidden();
  });

  test('추천 입력의 수정 버튼을 누르면 파싱되어 블럭 인풋에 채워진다', async ({
    page,
  }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail([], ['*문이 열린다* 누구세요?'])),
      });
    });

    await page.goto('/chats/c1');
    await page
      .getByRole('button', { name: '입력창에 넣어 수정' })
      .first()
      .click();

    await expect(page.getByPlaceholder('어떤 상황을 묘사할까요?')).toHaveValue(
      '문이 열린다',
    );
    await expect(page.getByPlaceholder('어떤 대사를 건넬까요?')).toHaveValue(
      '누구세요?',
    );
  });
});

// 서버는 문자열만으로 "추천 선택지와 같은 문장을 직접 입력한 경우"를 구분할 수 없어
// 입력 방식을 아는 프론트가 userSource를 명시한다(스펙 §3-8).
test.describe('입력 출처(userSource) 전달', () => {
  const SUGGESTION = '던전에 진입한다';
  const OTHER_CHOICE = '문 앞에서 잠시 기다린다';
  const SOURCE_TURN_ID = 42;
  const PLAIN_INPUT = '이야기를 어떻게 이어갈까요?';

  /** 추천 입력 1개를 가진 빈 채팅과 스트림 응답을 목킹한다. */
  const routeChatWithSuggestion = async (page: Page) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail([], [SUGGESTION])),
      });
    });
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          'event: started\ndata: {}\n\n',
          'event: token\ndata: {"text":"어둠이 깔린다."}\n\n',
          'event: completed\ndata: {"aiOutput":"어둠이 깔린다."}\n\n',
        ]),
      });
    });
  };

  /** 마지막 턴에 선택지 2개가 달린 채팅과 스트림 응답을 목킹한다. */
  const routeChatWithTurnChoices = async (page: Page) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          chatDetail([
            {
              id: SOURCE_TURN_ID,
              userInput: '문 앞에 도착한다',
              aiOutput: '무거운 문이 앞을 막고 있다.',
              choices: [OTHER_CHOICE, SUGGESTION],
              createdAt: '2026-06-01T00:00:00Z',
            },
          ]),
        ),
      });
    });
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          'event: started\ndata: {}\n\n',
          'event: token\ndata: {"text":"어둠이 깔린다."}\n\n',
          'event: completed\ndata: {"aiOutput":"어둠이 깔린다."}\n\n',
        ]),
      });
    });
  };

  /** 전송을 일으키고 실제로 나간 턴 요청 본문을 돌려준다. */
  const captureStreamBody = async (page: Page, send: () => Promise<void>) => {
    const [request] = await Promise.all([
      page.waitForRequest((target) =>
        target.url().includes('/api/v1/chats/c1/turns/stream'),
      ),
      send(),
    ]);

    return request.postDataJSON();
  };

  test('추천 입력을 탭해 바로 보내면 choice로 보낸다', async ({ page }) => {
    await routeChatWithSuggestion(page);
    await page.goto('/chats/c1');

    const body = await captureStreamBody(page, () =>
      page.getByRole('button', { name: SUGGESTION }).click(),
    );

    expect(body).toEqual({ userInput: SUGGESTION, userSource: 'choice' });
  });

  test('턴 선택지를 탭해 보내면 턴 ID와 1-based 순번을 함께 보낸다', async ({
    page,
  }) => {
    await routeChatWithTurnChoices(page);
    await page.goto('/chats/c1');

    const body = await captureStreamBody(page, () =>
      page.getByRole('button', { name: SUGGESTION }).click(),
    );

    expect(body).toEqual({
      userInput: SUGGESTION,
      userSource: 'choice',
      sourceTurnId: SOURCE_TURN_ID,
      choiceOrder: 2,
    });
  });

  test('턴 선택지를 무작위 전송해도 턴 ID와 해당 1-based 순번을 보낸다', async ({
    page,
  }) => {
    await routeChatWithTurnChoices(page);
    await page.goto('/chats/c1');

    const body = await captureStreamBody(page, () =>
      page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click(),
    );

    expect(body).toMatchObject({
      userSource: 'choice',
      sourceTurnId: SOURCE_TURN_ID,
    });
    expect([
      { userInput: OTHER_CHOICE, choiceOrder: 1 },
      { userInput: SUGGESTION, choiceOrder: 2 },
    ]).toContainEqual({
      userInput: body.userInput,
      choiceOrder: body.choiceOrder,
    });
  });

  test('추천 입력을 채운 뒤 그대로 보내면 choice로 보낸다', async ({
    page,
  }) => {
    await routeChatWithTurnChoices(page);
    await setPlainInputMode(page);
    await page.goto('/chats/c1');

    await page
      .getByRole('button', { name: '입력창에 넣어 수정' })
      .nth(1)
      .click();
    await expect(page.getByPlaceholder(PLAIN_INPUT)).toHaveValue(SUGGESTION);

    const body = await captureStreamBody(page, () =>
      page.getByRole('button', { name: '전송' }).click(),
    );

    expect(body).toEqual({
      userInput: SUGGESTION,
      userSource: 'choice',
      sourceTurnId: SOURCE_TURN_ID,
      choiceOrder: 2,
    });
  });

  test('추천 입력을 채운 뒤 고쳐 보내면 edited_choice로 보낸다', async ({
    page,
  }) => {
    const edited = `${SUGGESTION} 그리고 횃불을 켠다`;

    await routeChatWithTurnChoices(page);
    await setPlainInputMode(page);
    await page.goto('/chats/c1');

    await page
      .getByRole('button', { name: '입력창에 넣어 수정' })
      .nth(1)
      .click();

    const input = page.getByPlaceholder(PLAIN_INPUT);

    await expect(input).toHaveValue(SUGGESTION);
    await input.fill(edited);

    const body = await captureStreamBody(page, () =>
      page.getByRole('button', { name: '전송' }).click(),
    );

    expect(body).toEqual({
      userInput: edited,
      userSource: 'edited_choice',
      sourceTurnId: SOURCE_TURN_ID,
      choiceOrder: 2,
    });
  });

  test('채우기 없이 직접 입력해 보내면 typed로 보낸다', async ({ page }) => {
    await routeChatWithSuggestion(page);
    await setPlainInputMode(page);
    await page.goto('/chats/c1');

    await page.getByPlaceholder(PLAIN_INPUT).fill('횃불을 켜고 안쪽을 살핀다');

    const body = await captureStreamBody(page, () =>
      page.getByRole('button', { name: '전송' }).click(),
    );

    expect(body).toEqual({
      userInput: '횃불을 켜고 안쪽을 살핀다',
      userSource: 'typed',
    });
  });
});

test.describe('응답 재생성', () => {
  const lastTurn = {
    id: 7,
    userInput: '문을 연다',
    aiOutput: '문이 서서히 열린다.',
    choices: ['들어간다'],
    createdAt: '2026-06-01T00:00:00Z',
  };

  test('마지막 턴의 다시 생성 버튼이 새 응답으로 교체한다 (US-6-10)', async ({
    page,
  }) => {
    const regenerated = { ...lastTurn, aiOutput: '문이 굉음과 함께 부서졌다.' };
    let detailCallCount = 0;

    await page.route(CHAT_DETAIL, async (route) => {
      detailCallCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          detailCallCount === 1
            ? chatDetail([lastTurn])
            : chatDetail([regenerated]),
        ),
      });
    });
    await page.route(CHAT_REGENERATE, async (route) => {
      expect(route.request().postDataJSON()).toEqual({ turnId: 7 });
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          'event: started\ndata: {}\n\n',
          'event: token\ndata: {"text":"문이 굉음과 함께 부서졌다."}\n\n',
          'event: completed\ndata: {"aiOutput":"문이 굉음과 함께 부서졌다."}\n\n',
        ]),
      });
    });

    await page.goto('/chats/c1');

    await page.getByRole('button', { name: '다시 생성' }).click();

    // 새 본문으로 교체되고, 사용자 입력 버블은 유지된다.
    await expect(page.getByText('문이 굉음과 함께 부서졌다.')).toBeVisible();
    await expect(page.getByText('문을 연다')).toBeVisible();
    await expect(page.getByText('문이 서서히 열린다.')).toBeHidden();
  });

  test('엔딩 도달 턴에는 다시 생성 버튼이 없다', async ({ page }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          chatDetail([{ ...lastTurn, reachedEnding: '새드엔딩' }]),
        ),
      });
    });

    await page.goto('/chats/c1');

    const endingBadge = page.getByText('엔딩 · 새드엔딩');
    const endingMessage = endingBadge.locator(
      'xpath=ancestor::*[@data-slot="message-content"]',
    );

    await expect(page.getByText('문이 서서히 열린다.')).toBeVisible();
    await expect(endingBadge).toBeVisible();
    await expect(endingMessage.locator(':scope > *').first()).toHaveText(
      '엔딩 · 새드엔딩',
    );
    await expect(page.getByRole('button', { name: '다시 생성' })).toBeHidden();
  });

  test('error 이벤트 수신 시 기존 본문을 복원하고 실패 토스트를 띄운다', async ({
    page,
  }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail([lastTurn])),
      });
    });
    await page.route(CHAT_REGENERATE, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          'event: started\ndata: {}\n\n',
          'event: error\ndata: {"message":"생성 실패"}\n\n',
        ]),
      });
    });

    await page.goto('/chats/c1');

    await page.getByRole('button', { name: '다시 생성' }).click();

    await expect(page.getByText('응답 생성에 실패했어요')).toBeVisible();
    await expect(page.getByText('문이 서서히 열린다.')).toBeVisible();
    await expect(page.getByRole('button', { name: '다시 생성' })).toBeVisible();
  });
});

test.describe('추천 입력 토글', () => {
  const CHOICES = ['안으로 들어간다', '주변을 살핀다', '소리를 지른다'];
  const baseTurn = {
    id: 1,
    userInput: '던전에 진입한다',
    aiOutput: '문이 서서히 열린다.',
    choices: [] as string[],
    createdAt: '2026-06-01T00:00:00Z',
  };

  const setChoicesDisabled = async (page: Page) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('manyak:chat-choices-enabled', 'false');
    });
  };

  const routeStream = async (page: Page) => {
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          'event: started\ndata: {}\n\n',
          'event: token\ndata: {"text":"문이 서서히 열린다."}\n\n',
          'event: completed\ndata: {"aiOutput":"문이 서서히 열린다."}\n\n',
        ]),
      });
    });
  };

  test('토글 기본 on: 턴 완료 후 선택지 생성을 호출하고 재조회로 렌더한다', async ({
    page,
  }) => {
    let choicesCalled = 0;

    await page.route(CHAT_DETAIL, async (route) => {
      const body =
        choicesCalled > 0
          ? chatDetail([{ ...baseTurn, choices: CHOICES }])
          : chatDetail([baseTurn]);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
    await routeStream(page);
    await page.route(CHAT_CHOICES, async (route) => {
      choicesCalled += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: CHOICES }),
      });
    });

    await setPlainInputMode(page);
    await page.goto('/chats/c1');

    await page.getByPlaceholder('이야기를 어떻게 이어갈까요?').fill('진입한다');
    await page.getByRole('button', { name: '전송' }).click();

    await expect(
      page.getByRole('button', { name: '안으로 들어간다' }),
    ).toBeVisible();
    expect(choicesCalled).toBe(1);
  });

  test('토글 off: 턴이 끝나도 선택지 생성을 호출하지 않는다', async ({
    page,
  }) => {
    let choicesCalled = 0;

    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail([baseTurn])),
      });
    });
    await routeStream(page);
    await page.route(CHAT_CHOICES, async (route) => {
      choicesCalled += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: CHOICES }),
      });
    });

    await setChoicesDisabled(page);
    await setPlainInputMode(page);
    await page.goto('/chats/c1');

    await page.getByPlaceholder('이야기를 어떻게 이어갈까요?').fill('진입한다');
    await page.getByRole('button', { name: '전송' }).click();

    await expect(page.getByText('문이 서서히 열린다.')).toBeVisible();
    expect(choicesCalled).toBe(0);
  });

  test('off 상태로 턴이 끝난 뒤 토글을 켜면 즉시 마지막 턴 선택지를 생성한다', async ({
    page,
  }) => {
    let choicesCalled = 0;

    await page.route(CHAT_DETAIL, async (route) => {
      const body =
        choicesCalled > 0
          ? chatDetail([{ ...baseTurn, choices: CHOICES }])
          : chatDetail([baseTurn]);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
    await page.route(CHAT_CHOICES, async (route) => {
      choicesCalled += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: CHOICES }),
      });
    });

    await setChoicesDisabled(page);
    await page.goto('/chats/c1');

    await page.getByRole('button', { name: '추천 입력 설정' }).click();
    await page.getByRole('menuitemradio', { name: /추천 입력 켬/ }).click();

    await expect(
      page.getByRole('button', { name: '안으로 들어간다' }),
    ).toBeVisible();
    expect(choicesCalled).toBe(1);
  });

  test('선택지가 표시된 상태에서 끄면 표시된 선택지를 숨기고, 다시 켜면 재표시한다', async ({
    page,
  }) => {
    let choicesCalled = 0;

    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail([{ ...baseTurn, choices: CHOICES }])),
      });
    });
    await page.route(CHAT_CHOICES, async (route) => {
      choicesCalled += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: CHOICES }),
      });
    });

    await page.goto('/chats/c1');

    const firstChoice = page.getByRole('button', { name: '안으로 들어간다' });

    await expect(firstChoice).toBeVisible();

    await page.getByRole('button', { name: '추천 입력 설정' }).click();
    await page.getByRole('menuitemradio', { name: /추천 입력 끔/ }).click();
    await expect(firstChoice).toBeHidden();

    await page.getByRole('button', { name: '추천 입력 설정' }).click();
    await page.getByRole('menuitemradio', { name: /추천 입력 켬/ }).click();
    await expect(firstChoice).toBeVisible();

    expect(choicesCalled).toBe(0);
  });

  test('토글 off: 추천 입력이 있어도 빈 입력이면 전송 버튼이 화살표 아이콘으로 비활성화된다', async ({
    page,
  }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });

    await setChoicesDisabled(page);
    await setPlainInputMode(page);
    await page.goto('/chats/c1');

    const sendButton = page.getByRole('button', { name: '전송', exact: true });

    await expect(sendButton).toBeDisabled();
    await expect(
      sendButton.locator(`path[d^="${PLAY_FILLED_PATH}"]`),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: '추천 입력 랜덤 전송' }),
    ).toHaveCount(0);

    await page
      .getByPlaceholder('이야기를 어떻게 이어갈까요?')
      .fill('직접 입력한다');
    await expect(sendButton).toBeEnabled();
  });

  test('선택지 생성 실패 시 에러 문구와 재시도 버튼을 보여주고, 재시도로 복구한다', async ({
    page,
  }) => {
    let choicesCalled = 0;

    await page.route(CHAT_DETAIL, async (route) => {
      const body =
        choicesCalled > 1
          ? chatDetail([{ ...baseTurn, choices: CHOICES }])
          : chatDetail([baseTurn]);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
    await routeStream(page);
    await page.route(CHAT_CHOICES, async (route) => {
      choicesCalled += 1;

      if (choicesCalled === 1) {
        await route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'AI 호출 실패' }),
        });

        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: CHOICES }),
      });
    });

    await setPlainInputMode(page);
    await page.goto('/chats/c1');

    await page.getByPlaceholder('이야기를 어떻게 이어갈까요?').fill('진입한다');
    await page.getByRole('button', { name: '전송' }).click();

    await expect(page.getByText('선택지를 만들지 못했어요')).toBeVisible();
    await page.getByRole('button', { name: '다시 시도' }).click();

    await expect(
      page.getByRole('button', { name: '안으로 들어간다' }),
    ).toBeVisible();
    expect(choicesCalled).toBe(2);
  });
});
