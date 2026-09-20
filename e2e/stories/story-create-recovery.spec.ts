import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  type PendingCreationRequest,
  STORY_COMPLETION_REQUESTS_STORAGE_KEY,
  type StoryCompletionRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { STORY_CREATE_BACK_DIALOG_COPY } from '@/features/stories/new/components/header/story-create-back-dialog';
import { STORYLINE_SELECT_LOADING_LABEL } from '@/features/stories/new/constants';
import {
  CREATE_STORY_FAB_COPY,
  CREATION_PROGRESS_CARD_COPY,
} from '@/features/studio/menu/constants';

import {
  seedPendingCreationRequest,
  seedStoryCompletionRequests,
} from '../fixtures/storage';
import {
  expect,
  mockGuestSession,
  mockMemberSession,
  seedStoryIds,
  skipOnboarding,
  test,
} from '../fixtures/test';

// 백그라운드 생성 복귀(KNK-637, 스펙 §3-5): 앱 전환으로 응답을 못 받은 생성 요청을
// 퍼널 재진입 시 복구 조회(GET /creation-requests/{requestId})로 되찾는 흐름.
const TAGS = '**/api/v1/stories/simple/tags';
const STORYLINES = '**/api/v1/stories/simple/storylines';
const CREATION_REQUEST = '**/api/v1/stories/simple/creation-requests/*';

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

const completionRecord: StoryCompletionRecord = {
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
  // 제작은 회원 전용이라 회원 세션을 기본으로 잡고, 게스트 목록 시나리오만 되돌린다.
  test.beforeEach(async ({ page }) => {
    await mockMemberSession(page);
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

  test('진행 중인 스토리라인 POST는 제작 탭과 퍼널 재진입에서도 복구 조회보다 우선한다', async ({
    page,
  }) => {
    await skipOnboarding(page);

    let releaseGeneration!: () => void;
    const generationReady = new Promise<void>((resolve) => {
      releaseGeneration = resolve;
    });
    let completed = false;
    let lookupCount = 0;

    await page.route(STORYLINES, async (route) => {
      await generationReady;
      completed = true;
      await route.fulfill({ status: 201, json: storylinesResult });
    });
    await page.route(CREATION_REQUEST, async (route) => {
      lookupCount += 1;
      await route.fulfill({
        status: completed ? 200 : 404,
        json: completed
          ? {
              stage: 'STORYLINE_GENERATION',
              status: 'COMPLETED',
              result: storylinesResult,
            }
          : { message: '생성 요청을 찾을 수 없습니다.' },
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();
    await page.getByRole('button', { name: '스토리 만들기 닫기' }).click();
    await page
      .getByRole('button', {
        name: STORY_CREATE_BACK_DIALOG_COPY.saved.confirm,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));

    try {
      // 제작 카드의 한 폴링 주기 동안 등록 전 조회를 보내지 않는다.
      await page.waitForTimeout(5500);
      expect(lookupCount).toBe(0);
      await page
        .getByRole('button', {
          name: CREATION_PROGRESS_CARD_COPY.resume,
          exact: true,
        })
        .click();
      await expect(
        page.getByLabel(STORYLINE_SELECT_LOADING_LABEL),
      ).toBeVisible();
      // 새 퍼널의 mutation 인스턴스가 아니라 이전 화면에서 보낸 POST를 추적한다.
      await page.waitForTimeout(3500);
      expect(lookupCount).toBe(0);
      await expect(
        page.getByLabel(STORYLINE_SELECT_LOADING_LABEL),
      ).toBeVisible();
    } finally {
      releaseGeneration();
    }

    await expect(
      page.getByText(storylinesResult.storylines[0].storyline),
    ).toBeVisible();
    expect(lookupCount).toBeGreaterThan(0);
  });

  test('진행 중인 POST가 없는 완성 복구의 404는 초안과 실패 안내로 전환한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await seedStoryCompletionRequests(page, [completionRecord]);
    await page.route(CREATION_REQUEST, async (route) => {
      await route.fulfill({
        status: 404,
        json: { message: '생성 요청을 찾을 수 없습니다.' },
      });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(
      page.getByText(TOAST_MESSAGE.STORY_COMPLETE_FAILED),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: CREATION_PROGRESS_CARD_COPY.resume,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.completingTitle),
    ).toBeHidden();
  });

  for (const scenario of [
    {
      name: '게스트 기존 목록',
      member: false,
      existing: true,
      reducedMotion: false,
    },
    {
      name: '회원 기존 목록',
      member: true,
      existing: true,
      reducedMotion: false,
    },
    {
      name: '게스트 첫 스토리',
      member: false,
      existing: false,
      reducedMotion: false,
    },
    { name: '동작 줄이기', member: false, existing: true, reducedMotion: true },
  ]) {
    test(`완성 카드 교체는 새 목록을 기다리며 기존 카드 위치를 유지한다 (${scenario.name})`, async ({
      page,
    }) => {
      await skipOnboarding(page);
      await page.emulateMedia({
        reducedMotion: scenario.reducedMotion ? 'reduce' : 'no-preference',
      });

      if (!scenario.member) await mockGuestSession(page);

      const oldStory = {
        id: 'old-story',
        title: '기존 스토리',
        genres: ['판타지'],
        createdAt: '2026-06-01T00:00:00Z',
      };
      const newStory = { ...oldStory, id: 'new-story', title: '완성된 스토리' };
      const existingStories = scenario.existing ? [oldStory] : [];

      await seedStoryIds(
        page,
        existingStories.map(({ id }) => id),
      );
      await seedStoryCompletionRequests(page, [completionRecord]);

      let completed = false;
      let refreshing = false;
      let releaseList!: () => void;
      const listReady = new Promise<void>((resolve) => {
        releaseList = resolve;
      });

      await page.route(
        scenario.member
          ? '**/api/v1/users/me/stories*'
          : '**/api/v1/stories/batch',
        async (route) => {
          if (completed) {
            refreshing = true;
            await listReady;
          }

          await route.fulfill({
            json: completed ? [newStory, ...existingStories] : existingStories,
          });
        },
      );
      await page.route(CREATION_REQUEST, async (route) => {
        await route.fulfill({
          json: {
            stage: 'STORY_COMPLETION',
            status: completed ? 'COMPLETED' : 'PENDING',
            result: completed ? newStory : null,
          },
        });
      });

      await page.goto(APP_PATH.MAIN.STUDIO);

      const progress = page.getByRole('article', {
        name: CREATION_PROGRESS_CARD_COPY.completingTitle,
      });

      await expect(progress).toBeVisible();

      const progressBox = await progress.boundingBox();
      const oldCard = page.getByRole('link', {
        name: `${oldStory.title} 상세 보기`,
      });

      if (scenario.existing) await expect(oldCard).toBeVisible();

      const oldNode = scenario.existing ? await oldCard.elementHandle() : null;
      const oldBox = scenario.existing ? await oldCard.boundingBox() : null;

      completed = true;

      try {
        await expect.poll(() => refreshing, { timeout: 10000 }).toBe(true);
        await expect(progress).toBeVisible();
        await expect(page.locator('ul[aria-hidden]')).toHaveCount(0);

        if (oldNode) {
          expect(await oldNode.evaluate((node) => node.isConnected)).toBe(true);
          expect((await oldCard.boundingBox())?.y).toBeCloseTo(oldBox!.y, 0);
        } else {
          await expect(
            page.getByRole('button', {
              name: CREATE_STORY_FAB_COPY.accessibleLabel,
              exact: true,
            }),
          ).toBeHidden();
        }
      } finally {
        releaseList();
      }

      const newCard = page.getByRole('link', {
        name: `${newStory.title} 상세 보기`,
      });

      await expect(newCard).toBeVisible();
      await expect(progress).toBeHidden();
      await expect(newCard).toHaveCount(1);
      await expect
        .poll(async () => (await newCard.boundingBox())?.y)
        .toBeCloseTo(progressBox!.y, 0);

      if (oldNode) {
        expect(await oldNode.evaluate((node) => node.isConnected)).toBe(true);
        await expect
          .poll(async () => (await oldCard.boundingBox())?.y)
          .toBeCloseTo(oldBox!.y, 0);
      }
    });
  }

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

  test('완성 중에 퍼널로 진입하면 완성 요청을 유지한 채 새 키워드 입력을 시작한다', async ({
    page,
  }) => {
    let lookupCount = 0;

    await page.route(CREATION_REQUEST, async (route) => {
      lookupCount += 1;
      await route.fulfill({
        json: { stage: 'STORY_COMPLETION', status: 'PENDING', result: null },
      });
    });
    await seedStoryCompletionRequests(page, [completionRecord]);

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await expect(page.getByRole('button', { name: '판타지' })).toBeVisible();
    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.completingTitle),
    ).toBeHidden();
    expect(lookupCount).toBe(0);
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        STORY_COMPLETION_REQUESTS_STORAGE_KEY,
      ),
    ).toContain(COMPLETION_REQUEST_ID);
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

test.describe('이어서 만들기 진행 카드', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
  });

  test('제작 탭에서 미정리 레코드가 있으면 진행 카드를 표시하고 탭하면 복구로 진입한다', async ({
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

    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeVisible();
    await page
      .getByRole('button', { name: '이어서 만들기', exact: true })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await expect(page.getByText('스토리라인을 만들고 있어요')).toBeVisible();
  });

  test('제작 탭에서 스토리라인 생성이 이미 끝나 있으면 카드 조회가 초안으로 승격해 로딩 없이 결과로 들어간다', async ({
    page,
  }) => {
    let statusRequestCount = 0;

    await page.route(CREATION_REQUEST, async (route) => {
      statusRequestCount += 1;
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
    await seedPendingCreationRequest(page, storylineRecord);

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          (key) => localStorage.getItem(key),
          'manyak:pending-creation-request',
        ),
      )
      .toContain('"stage":"STORY_DRAFT"');

    const statusRequestsBeforeResume = statusRequestCount;

    await page
      .getByRole('button', { name: '이어서 만들기', exact: true })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await expect(
      page.getByText('되찾은 첫 번째 이야기 흐름입니다.'),
    ).toBeVisible();
    expect(statusRequestCount).toBe(statusRequestsBeforeResume);
  });

  test('진행 카드에는 닫기 버튼 없이 이어서 만들기와 더보기만 표시한다', async ({
    page,
  }) => {
    await seedPendingCreationRequest(page, storylineRecord);

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '이어서 만들기 배너 닫기' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: '이어서 만들기', exact: true }),
    ).toHaveClass(/bg-primary/);
    await expect(
      page.getByRole('button', {
        name: CREATION_PROGRESS_CARD_COPY.optionsTrigger,
      }),
    ).toBeVisible();
  });

  test('레코드가 없으면 진행 카드를 표시하지 않는다', async ({ page }) => {
    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText('아직 만든 스토리가 없어요')).toBeVisible();
    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeHidden();
  });
});
