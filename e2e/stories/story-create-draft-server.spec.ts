import type { Page } from '@playwright/test';

import type {
  CreateSimpleStoryRequest,
  GenerateSimpleStorylinesResponse,
} from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { DRAFT_SAVE_BUTTON_LABEL } from '@/features/stories/_shared/components/draft-save-button';
import { DRAFT_CONFLICT_COPY } from '@/features/stories/_shared/constants/draft-conflict';
import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  CREATE_STORY_FAB_COPY,
  CREATION_PROGRESS_CARD_COPY,
} from '@/features/studio/menu/constants';

import {
  ART_STYLE_CATALOG_FIXTURE,
  mockStoryDrafts,
  type StoredStoryDraft,
  type StoryDraftMock,
} from '../fixtures/api-mock';
import {
  readCreationStorage,
  seedPendingCreationRequests,
} from '../fixtures/storage';
import {
  expect,
  mockGuestSession,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';

// 회원 간편 제작 임시 저장의 서버 보관(KNK-1667): 세션마다 고정한 초안 ID로 키워드 초안과 스토리라인 초안을
// 서버에 저장하고, 제작 탭의 서버 카드로 다른 기기에서도 이어서 만든다.
const TAGS = '**/api/v1/stories/simple/tags';
const STORYLINES = '**/api/v1/stories/simple/storylines';
const CREATE_STORY = '**/api/v1/stories/simple';
const CREATION_REQUEST = '**/api/v1/stories/simple/creation-requests/*';
const STORAGE_KEY = 'manyak:pending-creation-request';

const tags = [
  { id: 1, name: '판타지', category: 'GENRE' },
  { id: 2, name: '용감한', category: 'PROTAGONIST' },
];

const storylinesResponse: GenerateSimpleStorylinesResponse = {
  simpleCreationId: 1001,
  selectedTags: { genreTags: [], supportingCharacters: [] },
  storylines: [
    {
      id: 101,
      storyline: '첫 번째 이야기 흐름입니다.',
      recommendedInfos: [{ id: 1, text: '주인공은 비밀을 품고 있다' }],
    },
    { id: 102, storyline: '두 번째 이야기 흐름입니다.', recommendedInfos: [] },
    { id: 103, storyline: '세 번째 이야기 흐름입니다.', recommendedInfos: [] },
  ],
};

const DRAFT_ID = '16670000-0000-4000-8000-000000000020';
const GENERATION_ID = '16670000-0000-4000-8000-0000000000a1';
const CREATED_AT = '2026-10-16T03:00:00.000Z';

const keywordDraft: StoredStoryDraft = {
  draftId: DRAFT_ID,
  mode: 'SIMPLE',
  stage: 'KEYWORD_DRAFT',
  schemaVersion: 1,
  payload: {
    selectedGenreTagIds: [1],
    addedGenreTagIds: [],
    customGenreTags: [],
    protagonist: {
      name: '',
      gender: null,
      selectedTagIds: [2],
      customTags: [],
    },
    supportingCharacters: [],
  } as unknown as StoredStoryDraft['payload'],
  title: null,
  oneLineIntro: null,
  thumbnailObjectKey: null,
  generationRequestId: null,
  version: 1,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

const storyDraft: StoredStoryDraft = {
  ...keywordDraft,
  stage: 'STORY_DRAFT',
  payload: {
    step: 'additional-info',
    generationRequest: {
      requestId: GENERATION_ID,
      genreTagIds: [1],
      protagonist: {
        name: null,
        gender: null,
        featureTagIds: [2],
        customTags: [],
      },
      supportingCharacters: [],
    },
    activeStorylineIndex: 0,
    selectedStorylineId: 101,
    additionalInfos: ['사라진 왕국의 비밀'],
    selectedRecommendations: ['주인공은 비밀을 품고 있다'],
    artStyle: ART_STYLE_CATALOG_FIXTURE[2].code,
    createdStoryId: null,
    completionRequest: null,
  } as unknown as StoredStoryDraft['payload'],
  oneLineIntro: '첫 번째 이야기 흐름입니다.',
  generationRequestId: GENERATION_ID,
  version: 2,
};

/** 서버 초안 연결 없이 기기 안에 남은 스토리라인 초안이다(배포 전, 게스트 때 만든 초안). */
const legacyDraft: Extract<PendingCreationRequest, { stage: 'STORY_DRAFT' }> = {
  stage: 'STORY_DRAFT',
  requestId: GENERATION_ID,
  createdAt: CREATED_AT,
  step: 'storyline-select',
  generationRequest: {
    requestId: GENERATION_ID,
    genreTagIds: [1],
    protagonist: {
      name: null,
      gender: null,
      featureTagIds: [2],
      customTags: [],
    },
    supportingCharacters: [],
  },
  generationResult: storylinesResponse,
  activeStorylineIndex: 0,
  selectedStoryline: null,
  additionalInfos: [],
  selectedRecommendations: [],
  createdStoryId: null,
  completionRequest: null,
};

/**
 * 서로 다른 ID의 서버 키워드 초안을 만든다. 만들고 있는 스토리 카드 상한을 채울 때 쓴다.
 *
 * @param count 만들 초안 수
 * @returns 최신순 서버 초안 목록
 */
const keywordDrafts = (count: number) =>
  Array.from(
    { length: count },
    (_, index): StoredStoryDraft => ({
      ...keywordDraft,
      draftId: `16670000-0000-4000-8000-0000000003${index}0`,
      createdAt: `2026-10-1${index}T03:00:00.000Z`,
      updatedAt: `2026-10-1${index}T03:00:00.000Z`,
    }),
  );

const limitToast = (page: Page) =>
  page.getByText(TOAST_MESSAGE.STORY_DRAFT_CARD_LIMIT_REACHED);

/** 기기 안 편집 초안 목록의 stage 배열을 읽는다. */
const readLocalStages = async (page: Page) => {
  const raw = await readCreationStorage(page, STORAGE_KEY);

  return raw
    ? (JSON.parse(raw) as { stage: string }[]).map(({ stage }) => stage)
    : [];
};

const saveButton = (page: Page) =>
  page.getByRole('button', { name: DRAFT_SAVE_BUTTON_LABEL, exact: true });
const savedToast = (page: Page) =>
  page.getByText(TOAST_MESSAGE.STORY_DRAFT_SAVED);

/**
 * 스토리라인 생성을 응답하고 요청 ID를 서버 초안 목의 생성 결과로 등록한다(서버가 연결한 생성 요청의 결과를 상세로 주는 것을 흉내 낸다).
 *
 * @param page 대상 페이지
 * @param mock 서버 초안 목
 * @returns 받은 생성 요청 ID 목록
 */
const answerStorylines = async (page: Page, mock: StoryDraftMock) => {
  const requestIds: string[] = [];

  await page.route(STORYLINES, async (route) => {
    const { requestId } = route.request().postDataJSON() as {
      requestId: string;
    };

    requestIds.push(requestId);
    mock.generations.set(requestId, storylinesResponse);
    await route.fulfill({ status: 201, json: storylinesResponse });
  });

  return requestIds;
};

/** 키워드를 고르고 스토리라인을 만들어 선택 단계까지 간다. 키워드 단계에서 한 번 임시 저장한다. */
const generateAfterKeywordSave = async (page: Page) => {
  await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
  await page.getByRole('button', { name: '판타지' }).click();
  await saveButton(page).click();
  await expect(savedToast(page)).toBeVisible();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '용감한' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '스토리라인 만들기' }).click();
  await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
};

/** 제작 탭의 진행 카드에서 이어서 만들기를 누른다. */
const resumeFromStudio = async (page: Page) => {
  await page.goto(APP_PATH.MAIN.STUDIO);
  await page
    .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.resume })
    .click();
  await expect(page).toHaveURL(new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`));
};

test.describe('간편 제작 임시 저장 서버 보관', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
    await page.route(TAGS, async (route) => {
      await route.fulfill({ status: 200, json: tags });
    });
  });

  test('서버 키워드 초안 카드를 이어서 만들면 키워드를 복원한다 (STORY-DRAFT-20)', async ({
    page,
  }) => {
    await mockStoryDrafts(page, { initial: [keywordDraft] });
    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.draftDescription.keyword),
    ).toBeVisible();
    await resumeFromStudio(page);

    await expect(page.getByRole('button', { name: '판타지' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('서버 스토리라인 초안은 고른 스토리라인을 카드 설명으로 보이고 이어서 만들면 추가 정보 단계로 복원한다 (STORY-DRAFT-21)', async ({
    page,
  }) => {
    await mockStoryDrafts(page, {
      initial: [storyDraft],
      generations: { [GENERATION_ID]: storylinesResponse },
    });
    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    await resumeFromStudio(page);

    await expect(
      page.locator('textarea[aria-label="추가 정보 1"]'),
    ).toHaveValue('사라진 왕국의 비밀');
    await expect(
      page.getByRole('button', { name: '주인공은 비밀을 품고 있다' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('radio', { name: ART_STYLE_CATALOG_FIXTURE[2].name }),
    ).toBeChecked();
  });

  test('생성 결과를 찾을 수 없는 서버 초안은 안내 뒤 새로 시작한다 (STORY-DRAFT-22)', async ({
    page,
  }) => {
    await mockStoryDrafts(page, { initial: [storyDraft] });
    await resumeFromStudio(page);

    await expect(
      page.getByText(TOAST_MESSAGE.STORY_DRAFT_NOT_FOUND),
    ).toBeVisible();
    await expect(page.getByText('키워드를 선택해주세요')).toBeVisible();
  });

  test('회원이 키워드를 임시 저장하면 SIMPLE 키워드 초안으로 서버에 저장한다 (STORY-DRAFT-23)', async ({
    page,
  }) => {
    const mock = await mockStoryDrafts(page);

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await page.getByRole('button', { name: '판타지' }).click();
    await saveButton(page).click();
    await expect(savedToast(page)).toBeVisible();

    expect(mock.puts).toHaveLength(1);
    expect(mock.puts[0].body).toMatchObject({
      mode: 'SIMPLE',
      stage: 'KEYWORD_DRAFT',
      schemaVersion: 1,
      baseVersion: null,
      payload: { selectedGenreTagIds: [1] },
    });
    expect(await readLocalStages(page)).toEqual([]);
  });

  test('진입 뒤 세션 재조회로 회원 판정이 바뀌어도 세션의 저장 위치를 바꾸지 않는다 (STORY-DRAFT-30)', async ({
    page,
  }) => {
    const mock = await mockStoryDrafts(page);
    let isSessionLost = false;
    let sessionFetches = 0;

    // 창으로 돌아올 때의 세션 재조회가 세션을 잃은 것으로 답한다.
    await page.route('**/api/auth/session', async (route) => {
      if (!isSessionLost || route.request().method() !== 'GET') {
        await route.fallback();

        return;
      }

      sessionFetches += 1;
      await route.fulfill({ status: 200, json: null });
    });
    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await expect(page.getByRole('button', { name: '판타지' })).toBeVisible();

    isSessionLost = true;
    await page.evaluate(() =>
      document.dispatchEvent(new Event('visibilitychange')),
    );
    await expect.poll(() => sessionFetches).toBeGreaterThan(0);

    await page.getByRole('button', { name: '판타지' }).click();
    await saveButton(page).click();
    await expect.poll(() => mock.puts.length).toBe(1);
    expect(await readLocalStages(page)).toEqual([]);
  });

  test('스토리라인을 골라 추가 정보로 넘어가면 같은 초안을 STORY_DRAFT로 덮어쓰고 생성 결과는 싣지 않는다 (STORY-DRAFT-24)', async ({
    page,
  }) => {
    const mock = await mockStoryDrafts(page);
    const requestIds = await answerStorylines(page, mock);

    await generateAfterKeywordSave(page);

    // 임시 저장 직후 단계 이동 저장이 겹쳐도 같은 기준 버전으로 두 번 나가 충돌하지 않아야 한다.
    await page.getByRole('tab', { name: '두 번째' }).click();
    await saveButton(page).click();
    await page.getByRole('tab', { name: '첫 번째' }).click();
    await page.getByRole('button', { name: '선택하기' }).click();
    await expect(
      page.locator('textarea[aria-label="추가 정보 1"]'),
    ).toBeVisible();
    await expect
      .poll(() => mock.puts.at(-1)?.body.oneLineIntro)
      .toBe('첫 번째 이야기 흐름입니다.');
    await expect(page.getByText(DRAFT_CONFLICT_COPY.title)).toHaveCount(0);

    const last = mock.puts.at(-1)!;

    expect(last.draftId).toBe(mock.puts[0].draftId);
    expect(last.body).toMatchObject({
      stage: 'STORY_DRAFT',
      generationRequestId: requestIds[0],
      payload: { step: 'additional-info', selectedStorylineId: 101 },
    });
    expect('generationResult' in (last.body.payload as object)).toBe(false);
    await expect.poll(() => readLocalStages(page)).toEqual([]);

    // 서버 초안으로 다시 열어 재생성해도 생성 기록 저장이 거절되지 않는다.
    await resumeFromStudio(page);
    await page
      .getByRole('navigation')
      .getByRole('button', { name: '다시 선택하기' })
      .click();
    await page.getByRole('button', { name: '다시 만들기' }).click();
    await expect.poll(() => requestIds.length).toBe(2);
    await expect(
      page.getByText(TOAST_MESSAGE.STORY_DRAFT_SAVE_FAILED),
    ).toHaveCount(0);
  });

  test('재생성이 실패한 뒤 저장해도 서버 초안은 결과를 만든 생성 요청을 가리킨다 (STORY-DRAFT-29)', async ({
    page,
  }) => {
    const mock = await mockStoryDrafts(page);
    const requestIds: string[] = [];

    // 첫 생성은 성공하고 재생성은 서버가 실패로 답한다.
    await page.route(STORYLINES, async (route) => {
      const { requestId } = route.request().postDataJSON() as {
        requestId: string;
      };

      requestIds.push(requestId);

      if (requestIds.length > 1) {
        await route.fulfill({ status: 500, json: { code: 'INTERNAL_ERROR' } });

        return;
      }

      mock.generations.set(requestId, storylinesResponse);
      await route.fulfill({ status: 201, json: storylinesResponse });
    });

    await generateAfterKeywordSave(page);
    await page.getByRole('button', { name: '다시 만들기' }).click();
    await expect.poll(() => requestIds.length).toBe(2);
    await page.getByRole('tab', { name: '두 번째' }).click();
    await saveButton(page).click();
    await expect(savedToast(page)).toBeVisible();

    expect(mock.puts.at(-1)?.body).toMatchObject({
      stage: 'STORY_DRAFT',
      generationRequestId: requestIds[0],
      payload: { generationRequest: { requestId: requestIds[0] } },
    });

    // 다른 기기에서 이어서 만들어도 생성 결과를 받아 연다.
    await resumeFromStudio(page);
    await expect(page.getByText('두 번째 이야기 흐름입니다.')).toBeVisible();
    await expect(
      page.getByText(TOAST_MESSAGE.STORY_DRAFT_NOT_FOUND),
    ).toHaveCount(0);
  });

  test('충돌 다이얼로그에서 저장하면 이 세션의 기기 안 생성 결과 기록을 지운다 (STORY-DRAFT-32)', async ({
    page,
  }) => {
    const mock = await mockStoryDrafts(page);

    await answerStorylines(page, mock);
    await generateAfterKeywordSave(page);
    await expect.poll(() => readLocalStages(page)).toEqual(['STORY_DRAFT']);

    // 생성 결과를 받는 동안 다른 기기가 같은 초안을 저장했다.
    const [draft] = mock.drafts.values();

    draft.version = 2;
    await page.getByRole('tab', { name: '두 번째' }).click();
    await saveButton(page).click();
    await page
      .getByRole('button', { name: DRAFT_CONFLICT_COPY.save, exact: true })
      .click();
    await expect(savedToast(page)).toBeVisible();

    expect(mock.drafts.get(draft.draftId)?.stage).toBe('STORY_DRAFT');
    await expect.poll(() => readLocalStages(page)).toEqual([]);
  });

  test('저장 중에 단계를 옮겨도 옮긴 단계의 저장을 뒤이어 보낸다 (STORY-DRAFT-33)', async ({
    page,
  }) => {
    const mock = await mockStoryDrafts(page);
    let releaseFirstPut = () => {};
    const firstPutHeld = new Promise<void>((resolve) => {
      releaseFirstPut = resolve;
    });
    let heldPuts = 0;

    await answerStorylines(page, mock);
    await generateAfterKeywordSave(page);

    // 스토리라인 선택 단계의 저장 응답을 붙잡아 둔 채 추가 정보 단계로 옮긴다.
    await page.route('**/api/v1/users/me/story-drafts/*', async (route) => {
      if (route.request().method() === 'PUT' && heldPuts++ === 0)
        await firstPutHeld;

      await route.fallback();
    });
    await page.getByRole('tab', { name: '두 번째' }).click();
    await saveButton(page).click();
    await expect.poll(() => heldPuts).toBe(1);
    await page.getByRole('button', { name: '선택하기' }).click();
    await expect(
      page.locator('textarea[aria-label="추가 정보 1"]'),
    ).toBeVisible();
    releaseFirstPut();

    await expect
      .poll(() => (mock.puts.at(-1)?.body.payload as { step?: string })?.step)
      .toBe('additional-info');
  });

  test('완성 요청에 세션 초안 ID를 싣는다 (STORY-DRAFT-25)', async ({
    page,
  }) => {
    const mock = await mockStoryDrafts(page);
    const completions: CreateSimpleStoryRequest[] = [];

    await answerStorylines(page, mock);
    await page.route(CREATE_STORY, async (route) => {
      completions.push(route.request().postDataJSON());
      await route.fulfill({
        status: 201,
        json: { id: 'story-new', title: '새 스토리', genres: ['판타지'] },
      });
    });

    await generateAfterKeywordSave(page);
    await page.getByRole('button', { name: '선택하기' }).click();
    await page
      .getByText(ART_STYLE_CATALOG_FIXTURE[2].name, { exact: true })
      .click();
    await page.getByRole('button', { name: '스토리 완성하기' }).click();

    await expect.poll(() => completions.length).toBe(1);
    expect(completions[0].draftId).toBe(mock.puts[0].draftId);
  });

  test('생성 중인 제작은 서버 키워드 초안과 카드 한 장으로 보인다 (STORY-DRAFT-27)', async ({
    page,
  }) => {
    const mock = await mockStoryDrafts(page);

    // 생성 응답이 오지 않고 서버는 계속 생성 중이라고 답한다.
    await page.route(STORYLINES, () => {});
    await page.route(CREATION_REQUEST, async (route) => {
      await route.fulfill({
        json: {
          stage: 'STORYLINE_GENERATION',
          status: 'PENDING',
          result: null,
        },
      });
    });
    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await page.getByRole('button', { name: '판타지' }).click();
    await saveButton(page).click();
    await expect(savedToast(page)).toBeVisible();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();
    await expect
      .poll(() => readLocalStages(page))
      .toEqual(['STORYLINE_GENERATION']);
    expect([...mock.drafts.values()].map(({ stage }) => stage)).toEqual([
      'KEYWORD_DRAFT',
    ]);

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.draftDescription.generating),
    ).toBeVisible();
    await expect(
      page.getByRole('article', {
        name: CREATION_PROGRESS_CARD_COPY.draftTitle,
      }),
    ).toHaveCount(1);
  });

  test('기기 안 생성 결과 카드를 지우면 같은 제작의 서버 초안도 지운다 (STORY-DRAFT-28)', async ({
    page,
  }) => {
    const mock = await mockStoryDrafts(page);

    await answerStorylines(page, mock);
    await generateAfterKeywordSave(page);
    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(
      page.getByRole('article', {
        name: CREATION_PROGRESS_CARD_COPY.draftTitle,
      }),
    ).toHaveCount(1);
    await page
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.optionsTrigger })
      .click();
    await page
      .getByRole('menuitem', { name: CREATION_PROGRESS_CARD_COPY.delete })
      .click();
    await page
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.delete })
      .click();

    await expect.poll(() => mock.drafts.size).toBe(0);
    await expect(
      page.getByRole('article', {
        name: CREATION_PROGRESS_CARD_COPY.draftTitle,
      }),
    ).toHaveCount(0);
    await expect.poll(() => readLocalStages(page)).toEqual([]);
  });

  test('만들고 있는 스토리 카드가 5장이면 새로 만들기를 막는다 (STORY-DRAFT-34)', async ({
    page,
  }) => {
    // 서버 초안 4개와 서버에 올리지 않은 기기 안 생성 결과 1개로, 서버 상한이 아니라 보이는 카드 수로 센다.
    await mockStoryDrafts(page, { initial: keywordDrafts(4) });
    await seedPendingCreationRequests(page, [legacyDraft]);
    await page.goto(APP_PATH.MAIN.STUDIO);
    await expect(
      page.getByRole('article', {
        name: CREATION_PROGRESS_CARD_COPY.draftTitle,
      }),
    ).toHaveCount(5);

    await page
      .getByRole('link', { name: CREATE_STORY_FAB_COPY.accessibleLabel })
      .click();

    await expect(limitToast(page)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
  });

  test('카드가 5장이면 간편 제작 주소로 바로 들어와도 안내한 뒤 제작 탭으로 보낸다 (STORY-DRAFT-35)', async ({
    page,
  }) => {
    const mock = await mockStoryDrafts(page, { initial: keywordDrafts(5) });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await expect(limitToast(page)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    expect(mock.puts).toEqual([]);
  });

  test('카드가 4장이면 새로 만들 수 있다 (STORY-DRAFT-36)', async ({
    page,
  }) => {
    await mockStoryDrafts(page, { initial: keywordDrafts(4) });
    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await expect(page.getByRole('button', { name: '판타지' })).toBeVisible();
    await expect(limitToast(page)).toHaveCount(0);
  });

  test('카드가 5장이어도 이어서 만들기는 연다 (STORY-DRAFT-37)', async ({
    page,
  }) => {
    await mockStoryDrafts(page, { initial: keywordDrafts(5) });
    await page.goto(APP_PATH.MAIN.STUDIO);
    await page
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.resume })
      .first()
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await expect(page.getByRole('button', { name: '판타지' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(limitToast(page)).toHaveCount(0);
  });

  test('기기 안 기록 뒤에 다른 곳에서 저장한 서버 초안은 따로 보이고 기기 안 카드를 지워도 남는다 (STORY-DRAFT-31)', async ({
    page,
  }) => {
    // 이 기기에서 생성 결과를 받은 뒤(서버 버전 1 기준) 다른 기기가 같은 초안을 버전 2로 저장했다.
    const mock = await mockStoryDrafts(page, {
      initial: [{ ...keywordDraft, version: 2 }],
    });

    await seedPendingCreationRequests(page, [
      { ...legacyDraft, draftId: DRAFT_ID, draftVersion: 1 },
    ]);
    await page.goto(APP_PATH.MAIN.STUDIO);

    const cards = page.getByRole('article', {
      name: CREATION_PROGRESS_CARD_COPY.draftTitle,
    });

    await expect(cards).toHaveCount(2);
    await cards
      .filter({
        hasText:
          CREATION_PROGRESS_CARD_COPY.draftDescription['storyline-select'],
      })
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.optionsTrigger })
      .click();
    await page
      .getByRole('menuitem', { name: CREATION_PROGRESS_CARD_COPY.delete })
      .click();
    await page
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.delete })
      .click();

    await expect(cards).toHaveCount(1);
    await expect.poll(() => readLocalStages(page)).toEqual([]);
    expect([...mock.drafts.keys()]).toEqual([DRAFT_ID]);
  });
});

test.describe('간편 제작 임시 저장 기기 안 유지', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.route(TAGS, async (route) => {
      await route.fulfill({ status: 200, json: tags });
    });
  });

  test('게스트와 기존 기기 안 초안 세션은 서버에 저장하지 않는다 (STORY-DRAFT-26)', async ({
    page,
  }) => {
    await mockGuestSession(page);

    const mock = await mockStoryDrafts(page);

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await page.getByRole('button', { name: '판타지' }).click();
    await saveButton(page).click();
    await expect(savedToast(page)).toBeVisible();
    await expect.poll(() => readLocalStages(page)).toEqual(['KEYWORD_DRAFT']);
    expect(mock.puts).toEqual([]);
  });

  test('게스트는 기기 안 카드가 5장이어도 새로 만들 수 있다 (STORY-DRAFT-38)', async ({
    page,
  }) => {
    await mockGuestSession(page);
    await seedPendingCreationRequests(
      page,
      Array.from({ length: 5 }, (_, index) => ({
        ...legacyDraft,
        requestId: `16670000-0000-4000-8000-0000000004${index}0`,
      })),
    );
    await page.goto(APP_PATH.MAIN.STUDIO);
    await expect(
      page.getByRole('article', {
        name: CREATION_PROGRESS_CARD_COPY.draftTitle,
      }),
    ).toHaveCount(5);
    await page
      .getByRole('link', { name: CREATE_STORY_FAB_COPY.accessibleLabel })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SELECT}$`),
    );
  });

  test('회원이 연결 없는 기기 안 초안을 이어서 만들면 기기 안에 저장한다 (STORY-DRAFT-26)', async ({
    page,
  }) => {
    await mockMemberSession(page);

    const mock = await mockStoryDrafts(page);

    await seedPendingCreationRequests(page, [legacyDraft]);
    await resumeFromStudio(page);
    await page.getByRole('button', { name: '선택하기' }).click();
    await expect
      .poll(() => readCreationStorage(page, STORAGE_KEY))
      .toContain('"step":"additional-info"');
    expect(mock.puts).toEqual([]);
  });
});
