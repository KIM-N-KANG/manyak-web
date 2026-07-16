import { type Page } from '@playwright/test';

import { expect, test } from '../fixtures/test';

// 채팅 스크롤 앵커 UX 회귀 스펙.
// 전송 시 사용자 메시지를 상단에 고정하기 위해 하단 스페이서가 생기는데,
// 1) 스트림 완료 시 스크롤이 위로 튀지 않아야 하고
// 2) 완료 후 위로 스크롤한 만큼 스페이서(빈 공간)가 회수되어야 한다.
const CHAT_DETAIL = '**/api/v1/chats/c1';

const LONG_OUTPUT =
  '용사는 어둠 속을 걸었다. 발밑에서 낡은 뼈가 부서졌다. '.repeat(12);

const STREAM_TOKEN_COUNT = 20;

const historyTurns = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  userInput: `과거 질문 ${i + 1}`,
  aiOutput: LONG_OUTPUT,
  choices: [],
  createdAt: '2026-06-01T00:00:00Z',
}));

const completedTurn = {
  id: 99,
  userInput: '앞으로 나아간다',
  aiOutput: Array.from(
    { length: STREAM_TOKEN_COUNT },
    (_, i) => `스트리밍 토큰 ${i}이 이어진다. `,
  ).join(''),
  choices: [],
  createdAt: '2026-06-01T00:10:00Z',
};

const chatDetail = (turns: unknown[]) => ({
  id: 'c1',
  storyId: 's1',
  storyTitle: '용의 계곡',
  prologue: '안개 낀 계곡 앞에 한 용사가 섰다.',
  turns,
  suggestedInputs: ['던전에 진입한다', '주변을 둘러본다'],
});

const setPlainInputMode = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('manyak:chat-input-mode', 'plain');
  });
};

// route.fulfill은 본문을 한 번에 내려 스트리밍 중 상호작용을 재현할 수 없어,
// 스트림 fetch만 느린 SSE(ReadableStream)로 대체한다.
const installSlowStream = async (page: Page, tokenCount: number) => {
  await page.addInitScript((count) => {
    const origFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof Request
            ? input.url
            : String(input);

      if (!url.includes('/turns/stream')) {
        return origFetch(input, init);
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (s: string) => controller.enqueue(encoder.encode(s));

          send('event: started\ndata: {}\n\n');

          for (let i = 0; i < count; i++) {
            await new Promise((r) => setTimeout(r, 80));
            send(
              `event: token\ndata: {"text":"스트리밍 토큰 ${i}이 이어진다. "}\n\n`,
            );
          }

          send('event: completed\ndata: {"aiOutput":"done"}\n\n');
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    };
  }, tokenCount);
};

// rAF마다 뷰포트 scrollTop 최솟값을 추적해 순간적인 위 방향 튐을 잡아낸다.
const installScrollDipTracker = async (page: Page) => {
  await page.addInitScript(() => {
    const win = window as unknown as {
      __resetMinScrollTop: () => void;
      __minScrollTop: number;
    };

    win.__minScrollTop = Number.POSITIVE_INFINITY;
    win.__resetMinScrollTop = () => {
      win.__minScrollTop = Number.POSITIVE_INFINITY;
    };

    const tick = () => {
      const viewport = document.querySelector<HTMLElement>(
        '[data-slot="message-scroller-viewport"]',
      );

      if (viewport) {
        win.__minScrollTop = Math.min(win.__minScrollTop, viewport.scrollTop);
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
};

const mockChatDetail = async (page: Page) => {
  let detailCallCount = 0;

  await page.route(CHAT_DETAIL, async (route) => {
    detailCallCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        detailCallCount === 1
          ? chatDetail(historyTurns)
          : chatDetail([...historyTurns, completedTurn]),
      ),
    });
  });
};

const sendMessage = async (page: Page) => {
  await page
    .getByPlaceholder('이야기를 어떻게 이어갈까요?')
    .fill('앞으로 나아간다');
  await page.getByRole('button', { name: '전송' }).click();
};

const viewportHandle = (page: Page) =>
  page.locator('[data-slot="message-scroller-viewport"]');

test.describe('채팅 스크롤 앵커', () => {
  test('스트림 완료 시 스크롤이 위로 튀지 않는다', async ({ page }) => {
    await mockChatDetail(page);
    await setPlainInputMode(page);
    await installSlowStream(page, STREAM_TOKEN_COUNT);
    await installScrollDipTracker(page);

    await page.goto('/chats/c1');
    await sendMessage(page);
    await expect(page.getByText('스트리밍 토큰 0이 이어진다.')).toBeVisible();

    // 스트리밍 중 아래(스페이서 영역)로 스크롤해 완료 시점 수축에 노출시킨다.
    const viewport = viewportHandle(page);

    await viewport.hover();
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200);

    const baseline = await viewport.evaluate((el) => el.scrollTop);

    await page.evaluate(() =>
      (
        window as unknown as { __resetMinScrollTop: () => void }
      ).__resetMinScrollTop(),
    );

    // 스트림 완료(스트리밍 블록 → 확정 턴 교체)까지 기다린다.
    await expect(
      page.getByRole('button', { name: 'AI 응답 생성 중' }),
    ).toBeHidden({ timeout: 10_000 });
    await page.waitForTimeout(300);

    const minScrollTop = await page.evaluate(
      () => (window as unknown as { __minScrollTop: number }).__minScrollTop,
    );

    // 교체 순간 한 프레임이라도 위로 크게 튀면 minScrollTop이 baseline보다 뚝 떨어진다.
    expect(minScrollTop).toBeGreaterThan(baseline - 100);
  });

  test('완료 후 위로 스크롤하면 하단 빈 공간(스페이서)이 회수된다', async ({
    page,
  }) => {
    await mockChatDetail(page);
    await setPlainInputMode(page);
    await installSlowStream(page, STREAM_TOKEN_COUNT);

    await page.goto('/chats/c1');
    await sendMessage(page);
    await expect(
      page.getByRole('button', { name: 'AI 응답 생성 중' }),
    ).toBeHidden({ timeout: 10_000 });

    const spacer = page.locator('[data-message-scroller-spacer]');

    // 위로 충분히 스크롤하면 스페이서가 전부 회수된다.
    const viewport = viewportHandle(page);

    await viewport.hover();

    await expect(async () => {
      await page.mouse.wheel(0, -400);

      const spacerHeight = await spacer.evaluate(
        (el) => el.getBoundingClientRect().height,
      );

      expect(spacerHeight).toBe(0);
    }).toPass({ timeout: 5_000 });

    // 다시 맨 아래로 내려도 콘텐츠 아래에 빈 공간이 없다.
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 400);
    }

    await page.waitForTimeout(200);

    const gap = await viewport.evaluate((el) => {
      const content = el.querySelector<HTMLElement>(
        '[data-slot="message-scroller-content"]',
      );
      const items = Array.from(content?.children ?? []).filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          !child.hasAttribute('data-message-scroller-spacer'),
      );
      const contentBottom = Math.max(
        ...items.map((item) => item.getBoundingClientRect().bottom),
      );

      return el.getBoundingClientRect().bottom - contentBottom;
    });

    // 뷰포트 하단 패딩(스크롤 페이드) 이상의 빈 공간이 없어야 한다.
    expect(gap).toBeLessThan(60);
  });
});
