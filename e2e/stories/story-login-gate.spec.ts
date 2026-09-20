import { APP_PATH } from '@/constants/app-path';
import { CREATED_CHAT_IDS_STORAGE_KEY } from '@/features/chats/_shared/utils/chat-id-storage';
import { GUEST_CHAT_IDS_STORAGE_KEY } from '@/features/chats/_shared/utils/guest-chat-storage';
import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  CREATE_STORY_FAB_COPY,
  CREATION_PROGRESS_CARD_COPY,
} from '@/features/studio/menu/constants';

import { seedPendingCreationRequest } from '../fixtures/storage';
import { expect, seedStoryIds, skipOnboarding, test } from '../fixtures/test';

/**
 * 스토리 제작·채팅 시작의 게스트 동의 게이팅 스펙(FE-SCREEN-010 동의 모델·웹 사용자 모델).
 * 게스트는 제작 화면에 바로 진입하고 생성 요청 직전에 별도로 동의한다
 * (QA STORY-GATE-01~06).
 */
const STORIES_BATCH = '**/api/v1/stories/batch';
const STORY_DETAIL = '**/api/v1/stories/s1';
const TAGS = '**/api/v1/stories/simple/tags';
const CREATE_CHAT = '**/api/v1/chats';

const story = {
  id: 's1',
  title: '용의 계곡',
  oneLineIntro: '한 줄 소개입니다',
  genres: ['판타지'],
  createdAt: '2026-06-01T00:00:00Z',
};

test.describe('스토리 제작 게스트 동의 게이트', () => {
  test('게스트가 제작 FAB를 누르면 동의 없이 제작 화면에 진입한다 (STORY-GATE-01)', async ({
    page,
  }) => {
    await seedStoryIds(page, ['s1']);
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({ json: [story] });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);
    await page
      .getByRole('link', { name: CREATE_STORY_FAB_COPY.accessibleLabel })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await expect(page.getByText('키워드를 선택해주세요')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('게스트가 빈 제작 목록에서 동의 없이 제작 화면에 진입한다 (STORY-GATE-02)', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto(APP_PATH.MAIN.STUDIO);
    // 빈 목록에도 별도 CTA 없이 FAB 하나만 둔다(KNK-1355).
    await page
      .getByRole('link', { name: CREATE_STORY_FAB_COPY.accessibleLabel })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await expect(page.getByText('키워드를 선택해주세요')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('게스트가 제작 URL에 직접 진입하면 동의 없이 태그를 조회하고 입력 화면을 표시한다 (STORY-GATE-03)', async ({
    page,
  }) => {
    let tagsRequestCount = 0;

    await page.route(TAGS, async (route) => {
      tagsRequestCount += 1;
      await route.fulfill({ json: [] });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await expect(page.getByText('키워드를 선택해주세요')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => tagsRequestCount).toBeGreaterThan(0);
  });

  test('게스트도 상세에서 새 채팅을 시작해 채팅방에 들어가되, 그 채팅은 채팅 목록 서재에 남는다 (STORY-GATE-04)', async ({
    page,
  }) => {
    let createChatCount = 0;

    await page.route(STORY_DETAIL, async (route) => {
      await route.fulfill({ json: { ...story, startSettings: [] } });
    });
    await page.route(CREATE_CHAT, async (route) => {
      createChatCount += 1;
      await route.fulfill({
        status: 201,
        json: { id: 'c-guest', storyId: 's1' },
      });
    });

    await page.goto('/stories/s1');
    await page.getByRole('button', { name: '새 채팅 시작하기' }).click();

    await expect(page).toHaveURL(/\/chats\/c-guest$/);
    expect(createChatCount).toBe(1);
    // 게스트 목록은 지속 저장소의 식별자로 복원한다.
    expect(
      await page.evaluate(
        ([listKey, tabKey]) => [
          window.localStorage.getItem(listKey),
          window.sessionStorage.getItem(tabKey),
        ],
        [CREATED_CHAT_IDS_STORAGE_KEY, GUEST_CHAT_IDS_STORAGE_KEY] as const,
      ),
    ).toEqual([JSON.stringify(['c-guest']), null]);
  });

  test('게스트가 초안 카드에서 이어서 만들기를 누르면 동의 없이 제작을 재개한다 (STORY-GATE-06)', async ({
    page,
  }) => {
    const draft: PendingCreationRequest = {
      stage: 'KEYWORD_DRAFT',
      requestId: '11111111-1111-4111-8111-111111111111',
      snapshot: {
        selectedGenreTagIds: [1],
        customGenreTags: [],
        protagonist: {
          name: '',
          gender: null,
          selectedTagIds: [],
          customTags: [],
        },
        supportingCharacters: [],
      },
    };

    await skipOnboarding(page);
    await seedPendingCreationRequest(page, draft);

    await page.goto(APP_PATH.MAIN.STUDIO);
    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeVisible();
    await page
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.resume })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await expect(page.getByText('키워드를 선택해주세요')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
