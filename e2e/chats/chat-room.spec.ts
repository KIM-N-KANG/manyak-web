import { type Page } from '@playwright/test';

import { mockMemberSession } from '../fixtures/auth';
import { expect, seedChatIds, skipOnboarding, test } from '../fixtures/test';

// 채팅 화면(/chats/[id])은 (chat) 레이아웃이라 온보딩 게이팅이 없다.
// 상세: GET /api/v1/chats/{id}, 이어쓰기: POST /api/v1/chats/{id}/turns/stream (text/event-stream).
// SSE 포맷: started → token({"text":...})×N → completed({"aiOutput":...}) | error({"message":...})
const CHAT_DETAIL = '**/api/v1/chats/c1';
const CHAT_STREAM = '**/api/v1/chats/c1/turns/stream';
const CHAT_REGENERATE = '**/api/v1/chats/c1/turns/regenerate/stream';
const PLAY_FILLED_PATH =
  'M21.4086 9.35258C23.5305 10.5065 23.5305 13.4935 21.4086 14.6474';

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

    // 스트림 실패 시 Meta StartTrial은 발화되지 않아야 한다.
    expect(pixelLogs.filter((log) => log.includes('StartTrial'))).toHaveLength(
      0,
    );
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
    await page.getByRole('menuitem', { name: '채팅 삭제하기' }).click();

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

    await expect(page.getByText('채팅을 삭제했어요')).toBeVisible();
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

    await expect(page.getByText('채팅을 삭제했어요')).toBeVisible();
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

    await expect(page.getByText('문이 서서히 열린다.')).toBeVisible();
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
