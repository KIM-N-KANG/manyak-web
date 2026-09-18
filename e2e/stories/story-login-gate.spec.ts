import { type Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';
import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  CREATE_STORY_FAB_COPY,
  CREATION_PROGRESS_CARD_COPY,
} from '@/features/studio/menu/constants';

import { oneLine } from '../fixtures/copy';
import { seedPendingCreationRequest } from '../fixtures/storage';
import { expect, seedStoryIds, skipOnboarding, test } from '../fixtures/test';

/**
 * 스토리 제작·채팅 시작의 회원 전용 게이팅 스펙(FE-SCREEN-010 동의 모델·웹 사용자 모델).
 * 게스트가 보호 기능을 시도하면 이동·요청 없이 현재 화면에서 로그인 필요 시트를 띄운다
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

const storyLoginSheet = (page: Page) =>
  page
    .getByRole('dialog')
    .getByRole('heading', { name: oneLine(LOGIN_COPY.title) });

const chatLoginSheet = (page: Page) =>
  page
    .getByRole('dialog')
    .getByRole('heading', { name: oneLine(LOGIN_COPY.title) });

test.describe('스토리 제작 로그인 게이트', () => {
  test('게스트가 제작 FAB를 누르면 이동 없이 로그인 필요 시트를 띄우고 닫으면 화면에 남는다 (STORY-GATE-01)', async ({
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

    const sheet = storyLoginSheet(page);
    const dialog = page.getByRole('dialog');

    await expect(sheet).toBeVisible();
    await expect(
      dialog.getByText(oneLine(LOGIN_COPY.linkNotice)),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: /카카오로 시작하기/ }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: /Google로 시작하기/ }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));

    await page.keyboard.press('Escape');

    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
  });

  test('게스트가 빈 제작 목록의 스토리 만들기를 눌러도 로그인 필요 시트를 띄운다 (STORY-GATE-02)', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto(APP_PATH.MAIN.STUDIO);
    await page.getByRole('button', { name: '스토리 만들기' }).click();

    await expect(storyLoginSheet(page)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
  });

  test('게스트가 /studio/story/simple에 직접 진입하면 퍼널 대신 로그인 게이트 화면과 시트를 보고 태그 조회도 하지 않는다 (STORY-GATE-03)', async ({
    page,
  }) => {
    let tagsRequestCount = 0;

    await page.route(TAGS, async (route) => {
      tagsRequestCount += 1;
      await route.fulfill({ json: [] });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    const dialog = page.getByRole('dialog');

    await expect(storyLoginSheet(page)).toBeVisible();
    await expect(page.getByText('키워드를 선택해주세요')).toHaveCount(0);

    // 시트를 닫아도 퍼널은 열리지 않고, 게이트 화면의 로그인 버튼으로 다시 열 수 있다.
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole('heading', {
        name: oneLine(LOGIN_COPY.title),
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: LOGIN_COPY.loginButton }).click();
    await expect(storyLoginSheet(page)).toBeVisible();
    expect(tagsRequestCount).toBe(0);
  });

  test('게스트가 상세에서 새 채팅 시작하기를 누르면 생성 요청 없이 로그인 필요 시트를 띄운다 (STORY-GATE-04)', async ({
    page,
  }) => {
    let createChatCount = 0;

    await page.route(STORY_DETAIL, async (route) => {
      await route.fulfill({ json: { ...story, startSettings: [] } });
    });
    await page.route(CREATE_CHAT, async (route) => {
      createChatCount += 1;
      await route.abort();
    });

    await page.goto('/stories/s1');
    await page.getByRole('button', { name: '새 채팅 시작하기' }).click();

    await expect(chatLoginSheet(page)).toBeVisible();
    await expect(page).toHaveURL(/\/stories\/s1$/);
    expect(createChatCount).toBe(0);
  });

  test('게스트가 빈 채팅 목록의 스토리 만들기를 눌러도 로그인 필요 시트를 띄운다 (STORY-GATE-05)', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto(APP_PATH.MAIN.CHATS);
    await page.getByRole('button', { name: '스토리 만들기' }).click();

    await expect(storyLoginSheet(page)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.CHATS}$`));
  });

  test('게스트의 예전 초안 카드에서 이어서 만들기를 눌러도 이동 없이 로그인 필요 시트를 띄운다 (STORY-GATE-06)', async ({
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

    await expect(storyLoginSheet(page)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
  });
});
