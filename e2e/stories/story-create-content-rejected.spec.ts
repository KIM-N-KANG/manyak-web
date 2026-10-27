import { type Page } from '@playwright/test';

import { API_ERROR_CODE } from '@/constants/api-error-code';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { CREATION_PROGRESS_CARD_COPY } from '@/features/studio/menu/constants';

import { completeStory } from '../fixtures/story-generation';
import { expect, mockMemberSession, test } from '../fixtures/test';

/**
 * 간편 제작에서 AI가 입력 내용을 거절한 경우(422 CONTENT_REJECTED)의 안내 스펙(KNK-1869).
 * 같은 입력은 다시 거절되므로 같은 요청을 다시 보내는 재시도 대신 입력을 고치게 한다.
 */
const TAGS = '**/api/v1/stories/simple/tags';
const STORYLINES = '**/api/v1/stories/simple/storylines';
const CREATE_STORY = '**/api/v1/stories/simple';

const tags = [
  { id: 1, name: '판타지', category: 'GENRE' },
  { id: 2, name: '용감한', category: 'PROTAGONIST' },
  { id: 3, name: '든든한', category: 'SUPPORTING_CHARACTER' },
];

const storylinesResponse = {
  simpleCreationId: 1001,
  selectedTags: { genreTags: [], supportingCharacters: [] },
  storylines: [
    { id: 101, storyline: '첫 번째 이야기 흐름입니다.', recommendedInfos: [] },
  ],
};

const contentRejected = {
  status: 422,
  json: {
    code: API_ERROR_CODE.CONTENT_REJECTED,
    message: '입력 내용이 안전 정책에 맞지 않아 생성할 수 없습니다.',
  },
};

/**
 * 키워드를 골라 스토리라인 생성을 요청한다.
 *
 * @param page 대상 페이지
 */
const requestStorylines = async (page: Page) => {
  await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
  await page.getByRole('button', { name: '판타지' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '용감한' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '스토리라인 만들기' }).click();
};

test.describe('간편 제작 입력 내용 거절', () => {
  test.beforeEach(async ({ page }) => {
    await mockMemberSession(page);
    await page.route(TAGS, async (route) => {
      await route.fulfill({ json: tags });
    });
  });

  test('스토리라인 생성이 거절되면 키워드 단계에서 입력 수정을 안내하고, 다시 요청하면 새 requestId를 쓴다', async ({
    page,
  }) => {
    const requestIds: string[] = [];

    await page.route(STORYLINES, async (route) => {
      const body = route.request().postDataJSON() as { requestId: string };

      requestIds.push(body.requestId);
      await route.fulfill(
        requestIds.length === 1
          ? contentRejected
          : { status: 201, json: storylinesResponse },
      );
    });

    await requestStorylines(page);

    await expect(
      page.getByText(TOAST_MESSAGE.STORY_CONTENT_REJECTED),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '다시 만들기' })).toHaveCount(
      0,
    );

    await page.getByRole('button', { name: '스토리라인 만들기' }).click();

    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    expect(requestIds).toHaveLength(2);
    expect(requestIds[1]).not.toBe(requestIds[0]);
  });

  test('스토리라인 재생성이 거절되면 키워드 단계로 돌아가 입력 수정을 안내한다', async ({
    page,
  }) => {
    let requestCount = 0;

    await page.route(STORYLINES, async (route) => {
      requestCount += 1;
      await route.fulfill(
        requestCount === 1
          ? { status: 201, json: storylinesResponse }
          : contentRejected,
      );
    });

    await requestStorylines(page);
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();

    await page.getByRole('button', { name: '다시 만들기' }).click();

    await expect(
      page.getByText(TOAST_MESSAGE.STORY_CONTENT_REJECTED),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '스토리라인 만들기' }),
    ).toBeVisible();
  });

  test('스토리 완성이 거절되면 제작 탭에서 입력 수정을 안내하고 초안 카드로 되돌린다', async ({
    page,
  }) => {
    await page.route(STORYLINES, async (route) => {
      await route.fulfill({ status: 201, json: storylinesResponse });
    });
    await page.route(CREATE_STORY, async (route) => {
      await route.fulfill(contentRejected);
    });

    await requestStorylines(page);
    await page.getByRole('button', { name: '선택하기' }).click();
    await completeStory(page);

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(
      page.getByText(TOAST_MESSAGE.STORY_CONTENT_REJECTED),
    ).toBeVisible();
    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeVisible();
  });
});
