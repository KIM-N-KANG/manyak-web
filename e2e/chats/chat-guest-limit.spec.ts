import { type Page } from '@playwright/test';

import { mockMemberSession } from '../fixtures/auth';
import { expect, seedGuestUsage, skipChatTour, test } from '../fixtures/test';

// 첫 진입 안내 투어는 별도 스펙(chat-tour)에서 다루므로 여기서는 노출을 막는다.
test.beforeEach(async ({ page }) => {
  await skipChatTour(page);
});

/**
 * 채팅 턴의 게스트 체험 한도(전 채팅방 합산 5회)·크레딧 게이팅 스펙.
 * 로컬 카운터 선차단, 서버 402 사유별 다이얼로그 분기를 검증한다(QA CHAT-LIMIT-01~03).
 * 한도 수치의 정본은 백엔드 정책이며, 클라이언트 선차단은 `GUEST_LIMITS`를 따른다.
 */
const CHAT_DETAIL = '**/api/v1/chats/c1';
const CHAT_STREAM = '**/api/v1/chats/c1/turns/stream';
const ME_API = '**/api/v1/auth/me';
const ATTENDANCE_API = '**/api/v1/users/me/credits/attendance';

const chatDetail = {
  id: 'c1',
  storyId: 's1',
  storyTitle: '용의 계곡',
  prologue: '안개 낀 계곡 앞에 한 용사가 섰다.',
  turns: [],
  suggestedInputs: [],
};

/**
 * 상세 응답을 목킹하고 textarea 기반 검증을 위해 일반 입력 모드를 고정한다.
 *
 * @param page 대상 페이지
 */
/**
 * 사용자 조회(me) 응답을 출석 여부만 바꿔 목킹한다.
 *
 * @param page 대상 페이지
 * @param attendedToday 오늘 출석 완료 여부
 */
const mockMe = async (page: Page, attendedToday: boolean) => {
  await page.route(ME_API, async (route) => {
    await route.fulfill({
      json: {
        id: 'user-1',
        nickname: '배고픈 송아지',
        profileImageUrl: null,
        status: 'ACTIVE',
        creditBalance: 5,
        attendedToday,
      },
    });
  });
};

const prepareChatRoom = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('manyak:chat-input-mode', 'plain');
  });
  await page.route(CHAT_DETAIL, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(chatDetail),
    });
  });
};

test.describe('채팅 게스트 한도·크레딧 게이팅', () => {
  test('게스트 로컬 카운터가 한도(5)에 도달하면 요청 없이 로그인 유도 다이얼로그를 띄운다 (US-10-5)', async ({
    page,
  }) => {
    let streamRequestCount = 0;

    await prepareChatRoom(page);
    await seedGuestUsage(page, { chat: 5 });
    await page.route(CHAT_STREAM, async (route) => {
      streamRequestCount += 1;
      await route.abort();
    });

    await page.goto('/chats/c1');
    await page.getByPlaceholder('이야기를 어떻게 이어갈까요?').fill('계속한다');
    await page.getByRole('button', { name: '전송' }).click();

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByText('게스트 체험 횟수를 모두 사용했어요'),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Google로 시작하기' }),
    ).toBeVisible();
    expect(streamRequestCount).toBe(0);
  });

  test('게스트가 서버 402(체험 한도)를 받으면 낙관적 버블을 제거하고 로그인 유도 다이얼로그를 띄운다 (US-10-5)', async ({
    page,
  }) => {
    // 로컬 카운터는 미달이어도 서버 판정이 우선한다(카운터 우회·기기 변경 케이스).
    await prepareChatRoom(page);
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'GUEST_TRIAL_LIMIT_EXCEEDED' }),
      });
    });

    await page.goto('/chats/c1');
    await page
      .getByPlaceholder('이야기를 어떻게 이어갈까요?')
      .fill('한계를 넘어선다');
    await page.getByRole('button', { name: '전송' }).click();

    await expect(
      page.getByRole('dialog').getByText('게스트 체험 횟수를 모두 사용했어요'),
    ).toBeVisible();
    // 전송 실패한 낙관적 사용자 버블은 화면에서 제거된다.
    await expect(page.getByText('한계를 넘어선다')).toBeHidden();
  });

  test('회원이 서버 402(크레딧 부족)를 받으면 크레딧 부족 다이얼로그를 띄운다 (US-10-4)', async ({
    page,
  }) => {
    await prepareChatRoom(page);
    await mockMemberSession(page);
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INSUFFICIENT_CREDIT' }),
      });
    });

    await page.goto('/chats/c1');
    await page.getByPlaceholder('이야기를 어떻게 이어갈까요?').fill('계속한다');
    await page.getByRole('button', { name: '전송' }).click();

    await expect(
      page.getByRole('dialog').getByText('크레딧이 부족해요'),
    ).toBeVisible();
  });

  test('크레딧 부족 다이얼로그에서 출석 체크에 성공하면 다이얼로그가 닫힌다 (CHAT-LIMIT-03)', async ({
    page,
  }) => {
    await prepareChatRoom(page);
    await mockMemberSession(page);
    await mockMe(page, false);
    await page.route(ATTENDANCE_API, async (route) => {
      await route.fulfill({ json: { rewarded: true, amount: 100 } });
    });
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INSUFFICIENT_CREDIT' }),
      });
    });

    await page.goto('/chats/c1');
    await page.getByPlaceholder('이야기를 어떻게 이어갈까요?').fill('계속한다');
    await page.getByRole('button', { name: '전송' }).click();

    const dialog = page.getByRole('dialog');

    await dialog.getByRole('button', { name: '출석 체크하기' }).click();

    await expect(dialog).toBeHidden();
  });

  test('출석 요청이 이미 출석으로 응답하면 토스트만 띄우고 다이얼로그는 유지된다 (CHAT-LIMIT-03)', async ({
    page,
  }) => {
    // 캐시된 me가 미출석이어도 서버 판정(멱등 200·rewarded=false)이 우선인 케이스.
    await prepareChatRoom(page);
    await mockMemberSession(page);
    await mockMe(page, false);
    await page.route(ATTENDANCE_API, async (route) => {
      await route.fulfill({ json: { rewarded: false, amount: null } });
    });
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INSUFFICIENT_CREDIT' }),
      });
    });

    await page.goto('/chats/c1');
    await page.getByPlaceholder('이야기를 어떻게 이어갈까요?').fill('계속한다');
    await page.getByRole('button', { name: '전송' }).click();

    const dialog = page.getByRole('dialog');

    await dialog.getByRole('button', { name: '출석 체크하기' }).click();

    await expect(page.getByText('오늘은 이미 출석 체크했어요')).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test('오늘 이미 출석했으면 크레딧 부족 다이얼로그의 출석 버튼이 비활성화된다 (CHAT-LIMIT-03)', async ({
    page,
  }) => {
    await prepareChatRoom(page);
    await mockMemberSession(page);
    await mockMe(page, true);
    await page.route(CHAT_STREAM, async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INSUFFICIENT_CREDIT' }),
      });
    });

    await page.goto('/chats/c1');
    await page.getByPlaceholder('이야기를 어떻게 이어갈까요?').fill('계속한다');
    await page.getByRole('button', { name: '전송' }).click();

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByRole('button', { name: '출석 완료' }),
    ).toBeDisabled();
    await expect(
      dialog.getByRole('button', { name: '친구 초대 하러 가기' }),
    ).toBeEnabled();
  });
});
