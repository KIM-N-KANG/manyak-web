import { type Page } from '@playwright/test';

import { TOAST_MESSAGE } from '@/constants/toast-message';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';
import { CHAT_MENU_COPY } from '@/features/chats/room/constants';

import { oneLine } from '../fixtures/copy';
import {
  expect,
  mockMemberSession,
  seedGuestChatIds,
  skipChatTour,
  test,
} from '../fixtures/test';

// 첫 진입 안내 투어는 별도 스펙(chat-tour)에서 다루므로 여기서는 노출을 막는다.
test.beforeEach(async ({ page }) => {
  await skipChatTour(page);
});

/**
 * 채팅 전송·재생성·새 채팅 시작의 회원 전용 게이팅과 회원 이프 게이팅 스펙
 * (웹 사용자 모델, §3-1-5 예외 처리 — QA CHAT-GATE-01~03·CHAT-LIMIT-03).
 * 게스트는 요청 없이 로그인 필요 시트를 보고, 회원의 402는 이프 부족 토스트로 안내한다.
 */
const CHAT_DETAIL = '**/api/v1/chats/c1';
const CHAT_STREAM = '**/api/v1/chats/c1/turns/stream';
const CHAT_REGENERATE = '**/api/v1/chats/c1/turns/regenerate/stream';
const CREATE_CHAT = '**/api/v1/chats';
const MIGRATE = '**/api/v1/auth/migrate';

const lastTurn = {
  id: 7,
  userInput: '문을 연다',
  aiOutput: '문이 서서히 열린다.',
  choices: ['들어간다'],
  createdAt: '2026-06-01T00:00:00Z',
};

const chatDetail = (turns: unknown[] = []) => ({
  id: 'c1',
  storyId: 's1',
  storyTitle: '용의 계곡',
  prologue: '안개 낀 계곡 앞에 한 용사가 섰다.',
  turns,
  suggestedInputs: [],
});

/** 상세 응답을 목킹하고 textarea 기반 검증을 위해 일반 입력 모드를 고정한다. */
const prepareChatRoom = async (page: Page, turns: unknown[] = []) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('manyak:chat-input-mode', 'plain');
  });
  await page.route(CHAT_DETAIL, async (route) => {
    await route.fulfill({ json: chatDetail(turns) });
  });
};

const chatLoginSheet = (page: Page) =>
  page
    .getByRole('dialog')
    .getByRole('heading', { name: oneLine(LOGIN_COPY.title) });

test.describe('채팅 로그인 게이트', () => {
  test('게스트가 전송하면 요청 없이 로그인 필요 시트를 띄우고 입력은 유지한다 (CHAT-GATE-01)', async ({
    page,
  }) => {
    let streamRequestCount = 0;

    await prepareChatRoom(page);
    await page.route(CHAT_STREAM, async (route) => {
      streamRequestCount += 1;
      await route.abort();
    });

    await page.goto('/chats/c1');

    const input = page.getByPlaceholder('이야기를 어떻게 이어갈까요?');

    await input.fill('계속한다');
    await page.getByRole('button', { name: '전송' }).click();

    const dialog = page.getByRole('dialog');

    await expect(chatLoginSheet(page)).toBeVisible();
    await expect(
      dialog.getByText(oneLine(LOGIN_COPY.linkNotice)),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: /카카오로 시작하기/ }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: /Google로 시작하기/ }),
    ).toBeVisible();
    expect(streamRequestCount).toBe(0);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(input).toHaveValue('계속한다');

    // 같은 탭으로 로그인을 다녀온 뒤(새로 그려진 채팅방)에도 입력이 그대로 남는다.
    await page.reload();
    await expect(
      page.getByPlaceholder('이야기를 어떻게 이어갈까요?'),
    ).toHaveValue('계속한다');
  });

  test('게스트가 추천 입력을 눌러도 요청 없이 로그인 필요 시트를 띄운다 (CHAT-GATE-01)', async ({
    page,
  }) => {
    let streamRequestCount = 0;

    await page.addInitScript(() => {
      window.localStorage.setItem('manyak:chat-input-mode', 'plain');
    });
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        json: { ...chatDetail(), suggestedInputs: ['던전에 진입한다'] },
      });
    });
    await page.route(CHAT_STREAM, async (route) => {
      streamRequestCount += 1;
      await route.abort();
    });

    await page.goto('/chats/c1');
    await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();

    await expect(chatLoginSheet(page)).toBeVisible();
    expect(streamRequestCount).toBe(0);
  });

  test('게스트가 다시 생성하면 요청 없이 로그인 필요 시트를 띄우고 본문을 유지한다 (CHAT-GATE-02)', async ({
    page,
  }) => {
    let regenerateRequestCount = 0;

    await prepareChatRoom(page, [lastTurn]);
    await page.route(CHAT_REGENERATE, async (route) => {
      regenerateRequestCount += 1;
      await route.abort();
    });

    await page.goto('/chats/c1');
    await page.getByRole('button', { name: '다시 생성' }).click();

    await expect(chatLoginSheet(page)).toBeVisible();
    await expect(page.getByText(lastTurn.aiOutput)).toBeVisible();
    expect(regenerateRequestCount).toBe(0);
  });

  test('게스트도 메뉴의 새 채팅 시작하기로 새 채팅방에 들어간다 (CHAT-GATE-03)', async ({
    page,
  }) => {
    let createChatCount = 0;

    await prepareChatRoom(page);
    await page.route('**/api/v1/chats/c-new', async (route) => {
      await route.fulfill({ json: { ...chatDetail(), id: 'c-new' } });
    });
    await page.route(CREATE_CHAT, async (route) => {
      createChatCount += 1;
      await route.fulfill({
        status: 201,
        json: { id: 'c-new', storyId: 's1' },
      });
    });

    await page.goto('/chats/c1');
    await page.getByRole('button', { name: CHAT_MENU_COPY.trigger }).click();
    await page
      .getByRole('dialog', { name: CHAT_MENU_COPY.title })
      .getByRole('button', { name: CHAT_MENU_COPY.newChat })
      .click();

    await expect(page).toHaveURL(/\/chats\/c-new$/);
    expect(createChatCount).toBe(1);
  });

  test('이 탭에서 게스트로 시작한 채팅은 로그인 후 자동 이관에 실린다 (CHAT-GATE-05)', async ({
    page,
  }) => {
    let migrateBody: { storyIds?: string[]; chatIds?: string[] } | undefined;

    await prepareChatRoom(page);
    await seedGuestChatIds(page, ['c1']);
    await mockMemberSession(page);
    await page.route(MIGRATE, async (route) => {
      migrateBody = route.request().postDataJSON();
      await route.fulfill({
        json: { stories: [], chats: [], migrationClosed: false },
      });
    });

    await page.goto('/chats/c1');

    await expect
      .poll(() => migrateBody)
      .toEqual({ storyIds: [], chatIds: ['c1'] });
    // 평가가 끝난 ID는 탭에서도 지운다.
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.sessionStorage.getItem('manyak:guest-chat-ids'),
        ),
      )
      .toBeNull();
  });

  test('회원이 서버 402(이프 부족)를 받으면 현재 화면에서 토스트만 띄운다 (CHAT-LIMIT-03)', async ({
    page,
  }) => {
    await prepareChatRoom(page);
    await mockMemberSession(page);
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 402,
        json: { code: 'INSUFFICIENT_CREDIT' },
      });
    });

    await page.goto('/chats/c1');
    await page.getByPlaceholder('이야기를 어떻게 이어갈까요?').fill('계속한다');
    await page.getByRole('button', { name: '전송' }).click();

    await expect(page.getByText(TOAST_MESSAGE.CREDIT_SHORTAGE)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/chats\/c1$/);
  });
});
