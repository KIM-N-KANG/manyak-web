import { APP_PATH } from '@/constants/app-path';
import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';

import { seedPendingCreationRequest } from '../fixtures/storage';
import { expect, skipOnboarding, test } from '../fixtures/test';

// 백그라운드 생성 복귀(KNK-637, 스펙 §3-5): 앱 전환으로 응답을 못 받은 생성 요청을
// 퍼널 재진입 시 복구 조회(GET /creation-requests/{requestId})로 되찾는 흐름.
const TAGS = '**/api/v1/stories/simple/tags';
const STORYLINES = '**/api/v1/stories/simple/storylines';
const CREATION_REQUEST = '**/api/v1/stories/simple/creation-requests/*';
const CREATE_CHAT = '**/api/v1/chats';

const STORYLINE_REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const COMPLETION_REQUEST_ID = '22222222-2222-4222-8222-222222222222';

const tags = [
  { id: 1, name: '판타지', category: 'GENRE' },
  { id: 2, name: '용감한', category: 'PROTAGONIST' },
];

const generationRequest = {
  requestId: STORYLINE_REQUEST_ID,
  genreTagIds: [1],
  protagonist: {
    name: null,
    gender: null,
    featureTagIds: [2],
    customTags: [],
  },
  supportingCharacters: [],
};

const storylinesResult = {
  simpleCreationId: 1001,
  selectedTags: { genreTags: [], supportingCharacters: [] },
  storylines: [
    {
      id: 101,
      storyline: '되찾은 첫 번째 이야기 흐름입니다.',
      recommendedInfos: [],
    },
    {
      id: 102,
      storyline: '되찾은 두 번째 이야기 흐름입니다.',
      recommendedInfos: [],
    },
    {
      id: 103,
      storyline: '되찾은 세 번째 이야기 흐름입니다.',
      recommendedInfos: [],
    },
  ],
};

const storylineRecord: PendingCreationRequest = {
  stage: 'STORYLINE_GENERATION',
  requestId: STORYLINE_REQUEST_ID,
  generationRequest,
};

const completionRecord: PendingCreationRequest = {
  stage: 'STORY_COMPLETION',
  requestId: COMPLETION_REQUEST_ID,
  generationRequest,
  generationResult: storylinesResult,
  selectedStoryline: storylinesResult.storylines[0],
  completionRequest: {
    requestId: COMPLETION_REQUEST_ID,
    simpleCreationId: 1001,
    storylineId: 101,
    additionalInfos: ['주인공은 비밀을 품고 있다'],
  },
};

test.describe('스토리 생성 백그라운드 복귀', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });
  });

  test('스토리라인 생성이 PENDING이면 로딩을 복원하고 완료되면 결과를 표시한다', async ({
    page,
  }) => {
    let pollCount = 0;

    await page.route(CREATION_REQUEST, async (route) => {
      pollCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          pollCount === 1
            ? { stage: 'STORYLINE_GENERATION', status: 'PENDING', result: null }
            : {
                stage: 'STORYLINE_GENERATION',
                status: 'COMPLETED',
                result: storylinesResult,
              },
        ),
      });
    });
    await seedPendingCreationRequest(page, storylineRecord);

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    // PENDING 동안 스토리라인 생성 로딩 화면을 복원한다.
    await expect(page.getByText('스토리라인을 만들고 있어요')).toBeVisible();

    // 폴링으로 COMPLETED를 받으면 결과 화면을 복원한다.
    await expect(
      page.getByText('되찾은 첫 번째 이야기 흐름입니다.'),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: '선택하기' })).toBeVisible();
  });

  test('백그라운드에서는 폴링을 멈추고 복귀하면 완료 결과를 되찾는다', async ({
    page,
  }) => {
    let pollCount = 0;
    let shouldComplete = false;

    await page.route(CREATION_REQUEST, async (route) => {
      pollCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          shouldComplete
            ? {
                stage: 'STORYLINE_GENERATION',
                status: 'COMPLETED',
                result: storylinesResult,
              }
            : {
                stage: 'STORYLINE_GENERATION',
                status: 'PENDING',
                result: null,
              },
        ),
      });
    });
    await seedPendingCreationRequest(page, storylineRecord);
    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await expect.poll(() => pollCount).toBe(1);

    await page.waitForTimeout(300);

    const pollCountAfterBackgroundSettled = pollCount;

    // 헤드리스 Chromium은 탭 전환에도 visible을 유지하므로 visibilitychange를
    // 직접 발생시켜 브라우저 백그라운드/복귀 계약을 검증한다.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await new Promise((resolve) => setTimeout(resolve, 3500));
    expect(pollCount).toBe(pollCountAfterBackgroundSettled);

    shouldComplete = true;
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(
      page.getByText('되찾은 첫 번째 이야기 흐름입니다.'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('스토리라인 POST 네트워크 오류 뒤 저장한 requestId로 완료 결과를 복구한다', async ({
    page,
  }) => {
    await page.route(STORYLINES, async (route) => route.abort('failed'));
    await page.route(CREATION_REQUEST, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stage: 'STORYLINE_GENERATION',
          status: 'COMPLETED',
          result: storylinesResult,
        }),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();

    await expect(
      page.getByText('되찾은 첫 번째 이야기 흐름입니다.'),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: '선택하기' })).toBeVisible();
  });

  test('스토리라인 실패 재시도의 409는 같은 requestId로 복구 폴링에 합류한다', async ({
    page,
  }) => {
    const requestIds: string[] = [];

    await page.route(STORYLINES, async (route) => {
      const body = route.request().postDataJSON() as { requestId: string };

      requestIds.push(body.requestId);
      await route.fulfill({
        status: requestIds.length === 1 ? 500 : 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'generation is pending' }),
      });
    });
    await page.route(CREATION_REQUEST, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stage: 'STORYLINE_GENERATION',
          status: 'COMPLETED',
          result: storylinesResult,
        }),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();
    await expect(page.getByText('스토리라인을 만들지 못했어요')).toBeVisible();

    await page.getByRole('button', { name: '다시 만들기' }).click();

    await expect(
      page.getByText('되찾은 첫 번째 이야기 흐름입니다.'),
    ).toBeVisible({ timeout: 10000 });
    expect(requestIds).toHaveLength(2);
    expect(requestIds[1]).toBe(requestIds[0]);
  });

  test('스토리 완성이 COMPLETED면 채팅 생성으로 이어 채팅 화면으로 이동한다', async ({
    page,
  }) => {
    await page.route(CREATION_REQUEST, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stage: 'STORY_COMPLETION',
          status: 'COMPLETED',
          result: {
            id: 'story-recovered',
            title: '되찾은 스토리',
            genres: ['판타지'],
          },
        }),
      });
    });
    await page.route(CREATE_CHAT, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'chat-recovered',
          storyId: 'story-recovered',
        }),
      });
    });
    await seedPendingCreationRequest(page, completionRecord);

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await expect(page).toHaveURL(/\/chats\/chat-recovered$/, {
      timeout: 10000,
    });
  });

  test('스토리라인 생성이 FAILED면 실패 문구와 다시 만들기를 표시한다', async ({
    page,
  }) => {
    await page.route(CREATION_REQUEST, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stage: 'STORYLINE_GENERATION',
          status: 'FAILED',
          result: null,
        }),
      });
    });
    await seedPendingCreationRequest(page, storylineRecord);

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await expect(page.getByText('스토리라인을 만들지 못했어요')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '다시 만들기' }),
    ).toBeVisible();
  });
});

test.describe('이어서 만들기 배너', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('제작 탭에서 미정리 레코드가 있으면 배너를 표시하고 탭하면 복구로 진입한다', async ({
    page,
  }) => {
    await page.route(CREATION_REQUEST, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stage: 'STORYLINE_GENERATION',
          status: 'PENDING',
          result: null,
        }),
      });
    });
    await seedPendingCreationRequest(page, storylineRecord);

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText('만들고 있는 스토리가 있어요')).toBeVisible();
    await page
      .getByRole('button', { name: '이어서 만들기', exact: true })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await expect(page.getByText('스토리라인을 만들고 있어요')).toBeVisible();
  });

  test('배너에는 닫기 버튼 없이 이어서 만들기만 표시한다', async ({ page }) => {
    await seedPendingCreationRequest(page, storylineRecord);

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText('만들고 있는 스토리가 있어요')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '이어서 만들기 배너 닫기' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: '이어서 만들기', exact: true }),
    ).toHaveClass(/text-primary/);
  });

  test('레코드가 없으면 배너를 표시하지 않는다', async ({ page }) => {
    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText('아직 만든 스토리가 없어요')).toBeVisible();
    await expect(page.getByText('만들고 있는 스토리가 있어요')).toBeHidden();
  });
});
