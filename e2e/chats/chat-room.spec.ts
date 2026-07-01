import { expect, test } from '../fixtures/test';

// 채팅방(/chats/[id])은 (chat) 레이아웃이라 온보딩 게이팅이 없다.
// 상세: GET /api/v1/chats/{id}, 이어쓰기: POST /api/v1/chats/{id}/turns/stream (text/event-stream).
// SSE 포맷: started → token({"text":...})×N → completed({"aiOutput":...}) | error({"message":...})
const CHAT_DETAIL = '**/api/v1/chats/c1';
const CHAT_STREAM = '**/api/v1/chats/c1/turns/stream';

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

    await page.goto('/chats/c1');
    await page
      .getByPlaceholder('이야기를 어떻게 이어갈까요?')
      .fill('앞으로 나아간다');
    await page.getByRole('button', { name: '전송' }).click();

    await expect(page.getByText('앞으로 나아간다')).toBeVisible();
    await expect(page.getByText('어둠이 너를 삼킨다.')).toBeVisible();
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

    await page.goto('/chats/c1');
    await page.getByPlaceholder('이야기를 어떻게 이어갈까요?').fill('계속한다');
    await page.getByRole('button', { name: '전송' }).click();

    await expect(
      page.getByText('응답 생성에 실패했어요. 잠시 후 다시 시도해주세요.'),
    ).toBeVisible();
  });
});
