import { type Page } from '@playwright/test';

import { mockMemberSession } from '../fixtures/auth';
import { expect, seedGuestUsage, seedStoryIds, test } from '../fixtures/test';

/**
 * 스토리 생성(게스트 1회)·채팅 시작(게스트 5회) 한도 게이팅 스펙.
 * 홈 FAB와 상세 CTA의 클라이언트 선차단, 채팅 생성 402 사유별 분기를 검증한다
 * (QA STORY-LIMIT-01·07·08).
 * 한도 수치의 정본은 백엔드 정책이며, 클라이언트 선차단은 `GUEST_LIMITS`를 따른다.
 */
const STORIES_BATCH = '**/api/v1/stories/batch';
const STORY_DETAIL = '**/api/v1/stories/s1';
const CREATE_CHAT = '**/api/v1/chats';

/** 402 응답 바디. 사유는 `code`로 구분한다(백엔드 KNK-524). */
const paymentRequired = (code: string) => ({
  status: 402,
  contentType: 'application/json',
  body: JSON.stringify({ code }),
});

const story = {
  id: 's1',
  title: '용의 계곡',
  oneLineIntro: '한 줄 소개입니다',
  genres: ['판타지'],
  createdAt: '2026-06-01T00:00:00Z',
};

/**
 * 스토리 상세 조회를 목킹한다. 시작 설정이 없어 CTA만 있는 최소 상세다.
 *
 * @param page 대상 페이지
 */
const mockStoryDetail = async (page: Page) => {
  await page.route(STORY_DETAIL, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...story, startSettings: [] }),
    });
  });
};

test.describe('스토리 게스트 한도 게이팅', () => {
  test('스토리 생성 한도(1)에 도달한 게스트가 FAB를 누르면 이동 없이 로그인 유도 다이얼로그를 띄운다 (US-10-5)', async ({
    page,
  }) => {
    // 저장된 스토리 ID 1개가 storyCreate 카운터 시드로도 작용한다(guest-usage-storage).
    await seedStoryIds(page, ['s1']);
    await seedGuestUsage(page, { storyCreate: 1 });
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([story]),
      });
    });

    await page.goto('/');
    await page.getByRole('link', { name: '스토리 만들기' }).click();

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByText('게스트 체험 횟수를 모두 사용했어요'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/$/);

    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('채팅 한도(5)에 도달한 게스트가 상세에서 채팅을 시작하면 요청 없이 로그인 유도 다이얼로그를 띄운다 (US-10-5)', async ({
    page,
  }) => {
    let createChatCount = 0;

    await seedGuestUsage(page, { chat: 5 });
    await mockStoryDetail(page);
    await page.route(CREATE_CHAT, async (route) => {
      createChatCount += 1;
      await route.abort();
    });

    await page.goto('/stories/s1');
    await page.getByRole('button', { name: '새 채팅 시작하기' }).click();

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByText('게스트 체험 횟수를 모두 사용했어요'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/stories\/s1$/);
    expect(createChatCount).toBe(0);
  });

  test('게스트 채팅 생성이 402(체험 한도)로 거절되면 실패 토스트가 아닌 로그인 다이얼로그를 띄운다 (STORY-LIMIT-08)', async ({
    page,
  }) => {
    // 로컬 카운터는 미달(0)이어도 서버 판정이 최종이다.
    await mockStoryDetail(page);
    await page.route(CREATE_CHAT, async (route) => {
      await route.fulfill(paymentRequired('GUEST_TRIAL_LIMIT_EXCEEDED'));
    });

    await page.goto('/stories/s1');
    await page.getByRole('button', { name: '새 채팅 시작하기' }).click();

    await expect(
      page.getByRole('dialog').getByText('게스트 체험 횟수를 모두 사용했어요'),
    ).toBeVisible();
    await expect(page.getByText('채팅을 시작하지 못했어요')).toBeHidden();
    await expect(page).toHaveURL(/\/stories\/s1$/);
  });

  test('회원 채팅 생성이 402(크레딧 부족)로 거절되면 크레딧 부족 다이얼로그를 띄운다 (STORY-LIMIT-08)', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await mockStoryDetail(page);
    await page.route(CREATE_CHAT, async (route) => {
      await route.fulfill(paymentRequired('INSUFFICIENT_CREDIT'));
    });

    await page.goto('/stories/s1');
    await page.getByRole('button', { name: '새 채팅 시작하기' }).click();

    const dialog = page.getByRole('dialog');

    await expect(dialog.getByText('크레딧이 부족해요')).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: '친구 초대 하러 가기' }),
    ).toBeVisible();
    await expect(page.getByText('채팅을 시작하지 못했어요')).toBeHidden();
  });
});
