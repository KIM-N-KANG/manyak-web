import { type Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { formatCreditAmount } from '@/constants/credit';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  PENDING_CREATION_REQUEST_STORAGE_KEY,
  STORY_COMPLETION_REQUESTS_STORAGE_KEY,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  buildStoryCompletionCreditCostLabel,
  GENRE_CATEGORY,
  PROTAGONIST_CATEGORY,
  STORY_COMPLETION_CREDIT_COST_LABEL,
  SUPPORTING_CHARACTER_CATEGORY,
} from '@/features/stories/new/constants';
import {
  CREATE_STORY_FAB_COPY,
  CREATION_PROGRESS_CARD_COPY,
} from '@/features/studio/menu/constants';

import {
  seedPendingCreationRequests,
  seedStoryCompletionRequests,
} from '../fixtures/storage';
import {
  CREDIT_POLICY_FIXTURE,
  expect,
  mockMemberSession,
  mockTrials,
  skipChatTour,
  skipOnboarding,
  test,
} from '../fixtures/test';

// 완성 제출 뒤 돌아오는 제작 탭의 온보딩 게이트와 채팅 화면의 안내 투어가 뜨지 않게 한다.
// 제작은 회원 전용이라 회원 세션으로 진행하고, 제작 탭 목록은 회원 목록(/users/me/stories)을 쓴다.
test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
  await skipChatTour(page);
  await mockMemberSession(page);
});

// 스토리 생성 4단계 funnel(/studio/story/simple, (story) 레이아웃이라 온보딩 게이팅 없음).
// API 순서: GET /stories/simple/tags → POST /stories/simple/storylines
//           → POST /stories/simple(제출 직후 /studio 복귀) → 완성 중 카드가 5초마다
//           GET /creation-requests/{id} → 완성되면 레코드 제거·목록 카드로 전환(채팅 자동 생성 없음)
// 각 URL이 명확히 달라 글롭 패턴이 겹치지 않는다(/simple 은 /simple/tags·/simple/storylines 와 별개).
const TAGS = '**/api/v1/stories/simple/tags';
const STORYLINES = '**/api/v1/stories/simple/storylines';
const CREATE_STORY = '**/api/v1/stories/simple';
const CREATION_REQUEST = '**/api/v1/stories/simple/creation-requests/*';
const CREATE_CHAT = '**/api/v1/chats';
const MY_STORIES = '**/api/v1/users/me/stories*';
const LEGACY_STORY_CREATE_PATH = '/stories/new';

const tags = [
  { id: 1, name: '판타지', category: 'GENRE' },
  { id: 2, name: '용감한', category: 'PROTAGONIST' },
  { id: 3, name: '든든한', category: 'SUPPORTING_CHARACTER' },
];

const storylinesResponse = {
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

async function reachAdditionalInfo(page: Page): Promise<void> {
  await page.route(TAGS, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(tags),
    });
  });
  await page.route(STORYLINES, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(storylinesResponse),
    });
  });

  await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
  await page.getByRole('button', { name: '판타지' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '용감한' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '스토리라인 만들기' }).click();

  const storyline = page.getByText('첫 번째 이야기 흐름입니다.');

  await expect(storyline).toBeVisible();
  await expect(storyline.locator('xpath=ancestor::p')).toHaveCSS(
    'line-height',
    '28px',
  );
  await expect(page.getByRole('tabpanel')).toHaveCSS('padding-bottom', '16px');
  await page.getByRole('button', { name: '선택하기' }).click();
  await expect(
    page.getByRole('button', { name: '스토리 완성하기' }),
  ).toBeVisible();

  const recommendedInfoSection = page.locator(
    'section[aria-labelledby="recommended-info-label"]',
  );
  const additionalInfoSection = page.locator(
    'section[aria-labelledby="additional-info-label"]',
  );
  const selectedStoryline = page.locator(
    '[data-testid="selected-storyline-content"] p',
  );

  await expect(recommendedInfoSection).toHaveCSS('margin-bottom', '8px');
  await expect(additionalInfoSection).toHaveCSS('padding-bottom', '16px');
  await expect(selectedStoryline).toHaveCSS('line-height', '28px');
}

test.describe('스토리 생성', () => {
  test('기존 생성 URL은 새 제작 URL로 이동한다 (KNK-988)', async ({ page }) => {
    await page.goto(LEGACY_STORY_CREATE_PATH);

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
  });

  test('직접 키워드가 비어 있으면 인풋 아래 오류를 표시하고 입력하면 해제한다', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await page.getByRole('button', { name: '키워드 추가' }).click();

    const dialog = page.getByRole('dialog');
    const input = dialog.getByRole('textbox', { name: '키워드' });
    const addButton = dialog.getByRole('button', { name: '추가하기' });
    const validationError = dialog.getByText('키워드를 입력해주세요', {
      exact: true,
    });

    await expect(addButton).toBeEnabled();
    await addButton.click();
    await expect(validationError).toBeVisible();
    await input.fill('타임루프');
    await expect(validationError).toBeHidden();
    await addButton.click();
    await expect(page.getByRole('button', { name: '타임루프' })).toBeVisible();
  });

  test('필수 키워드 없이 다음을 누르면 오류를 표시하고 선택하면 해제한다', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    const nextButton = page.getByRole('button', { name: '다음' });
    const validationError = page.getByText('키워드를 하나 이상 선택해주세요');
    const footer = page.getByRole('navigation').filter({ has: nextButton });
    const genrePanel = page.getByRole('tabpanel', {
      name: GENRE_CATEGORY.label,
    });
    const protagonistPanel = page.getByRole('tabpanel', {
      name: PROTAGONIST_CATEGORY.label,
    });
    const supportingCharacterPanel = page.getByRole('tabpanel', {
      name: SUPPORTING_CHARACTER_CATEGORY.label,
    });

    await expect(nextButton).toBeEnabled();
    await expect(genrePanel).toHaveCSS('padding-bottom', '16px');
    await nextButton.click();
    await expect(
      footer.getByText('키워드를 하나 이상 선택해주세요'),
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: /장르/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await page.getByRole('button', { name: '판타지' }).click();
    await expect(validationError).toBeHidden();
    await nextButton.click();
    await expect(
      page.getByRole('tab', { name: PROTAGONIST_CATEGORY.label }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(protagonistPanel).toHaveCSS('padding-top', '16px');
    await expect(protagonistPanel).toHaveCSS('padding-bottom', '16px');

    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    await expect(validationError).toBeVisible();

    await page.getByRole('button', { name: '용감한' }).click();
    await expect(validationError).toBeHidden();
    await nextButton.click();
    await expect(
      page.getByRole('tab', { name: SUPPORTING_CHARACTER_CATEGORY.label }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(supportingCharacterPanel).toHaveCSS('padding-bottom', '16px');
  });

  test('주인공과 주변 인물의 이름이 겹치면 생성 요청을 막는다 (스펙 §4-3-2)', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });

    let storylineRequestCount = 0;

    await page.route(STORYLINES, async (route) => {
      storylineRequestCount += 1;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(storylinesResponse),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('textbox', { name: '주인공 이름' }).fill('마냑');
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();

    // 공백·대소문자를 지운 정규화 키로 판정하므로 "마 냑"도 같은 이름이다.
    const supportingName = page.getByRole('textbox', {
      name: '주변 인물 1 이름',
    });

    await supportingName.fill('마 냑');
    await expect(page.getByText('이미 사용한 이름이에요')).toBeVisible();

    const createStorylineButton = page.getByRole('button', {
      name: '스토리라인 만들기',
    });

    await createStorylineButton.click();
    await expect(
      page.getByText('인물 이름이 겹치지 않게 해주세요'),
    ).toBeVisible();
    expect(storylineRequestCount).toBe(0);

    // 이름을 고치면 오류가 사라지고 요청이 나간다.
    await supportingName.fill('도라지');
    await expect(page.getByText('이미 사용한 이름이에요')).toBeHidden();
    await expect(
      page.getByText('인물 이름이 겹치지 않게 해주세요'),
    ).toBeHidden();

    await createStorylineButton.click();
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    expect(storylineRequestCount).toBe(1);
  });

  test('인물 이름에 닫는 대괄호를 허용한다', async ({ page }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });

    let storylineRequestCount = 0;

    await page.route(STORYLINES, async (route) => {
      storylineRequestCount += 1;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(storylinesResponse),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();

    const supportingName = page.getByRole('textbox', {
      name: '주변 인물 1 이름',
    });

    await supportingName.fill('세]린');
    await expect(supportingName).not.toHaveAttribute('aria-invalid', 'true');
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();

    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    expect(storylineRequestCount).toBe(1);
  });

  test('키워드 → 스토리라인 → 추가정보 → 완성하면 제작 탭으로 돌아오고 완성 중 카드가 목록 카드로 바뀐다 (US-3)', async ({
    page,
  }) => {
    let listRequestCount = 0;

    await page.route(CREATION_REQUEST, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stage: 'STORY_COMPLETION',
          status: 'COMPLETED',
          result: { id: 'story-new', title: '새 스토리', genres: ['판타지'] },
        }),
      });
    });
    await page.route(MY_STORIES, async (route) => {
      listRequestCount += 1;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'story-new',
            title: '새 스토리',
            oneLineIntro: '완성된 스토리',
            genres: ['판타지'],
            turnCount: 0,
            createdAt: new Date().toISOString(),
          },
        ]),
      });
    });
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });
    await page.route(STORYLINES, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(storylinesResponse),
      });
    });
    await page.route(CREATE_STORY, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'story-new',
          title: '새 스토리',
          genres: ['판타지'],
        }),
      });
    });

    let chatRequestCount = 0;

    await page.route(CREATE_CHAT, async (route) => {
      chatRequestCount += 1;
      await route.fulfill({ status: 500, body: '' });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    // Step 1: 키워드 선택 (장르 → 주인공 → 주변 인물)
    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();

    const createStorylineButton = page.getByRole('button', {
      name: '스토리라인 만들기',
    });

    await expect(createStorylineButton).toHaveAttribute('aria-busy', 'false');
    await createStorylineButton.click();

    // Step 2: 스토리라인 선택
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    await page.getByRole('button', { name: '선택하기' }).click();

    // Step 3: 추가 정보 → 완성
    await expect(
      page.getByRole('button', { name: '스토리 완성하기' }),
    ).toBeVisible();
    await page.getByRole('button', { name: '스토리 완성하기' }).click();

    // Step 4: 제출 직후 제작 탭으로 복귀. 완성 조회가 끝나면 완성 중 카드가 사라지고
    // 회원 목록에 실린 새 스토리 카드가 같은 자리에 나타난다. 채팅은 만들지 않는다.
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(
      page.getByRole('link', { name: '새 스토리 상세 보기' }),
    ).toBeVisible();
    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.completingTitle),
    ).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(
          (keys) => keys.map((key) => localStorage.getItem(key)),
          [
            PENDING_CREATION_REQUEST_STORAGE_KEY,
            STORY_COMPLETION_REQUESTS_STORAGE_KEY,
          ],
        ),
      )
      .toEqual([null, null]);
    expect(listRequestCount).toBeGreaterThan(0);
    expect(chatRequestCount).toBe(0);
  });

  for (const responseLost of [false, true]) {
    test(`완성 POST 등록 지연 중에는 복구 조회를 보류하고 한 번 제출로 완료한다 (${responseLost ? '응답 유실' : '성공 응답'})`, async ({
      page,
    }) => {
      let releaseCompletion!: () => void;
      const completionReady = new Promise<void>((resolve) => {
        releaseCompletion = resolve;
      });
      let completed = false;
      let completionCount = 0;
      let lookupCount = 0;
      let chatCount = 0;
      const story = {
        id: 'story-delayed-registration',
        title: '등록 지연 복구 스토리',
        genres: ['판타지'],
      };

      await page.route(CREATE_STORY, async (route) => {
        completionCount += 1;
        await completionReady;
        completed = true;

        if (responseLost) {
          await route.abort('failed');
        } else {
          await route.fulfill({ status: 201, json: story });
        }
      });
      await page.route(CREATION_REQUEST, async (route) => {
        lookupCount += 1;
        await route.fulfill({
          status: completed ? 200 : 404,
          json: completed
            ? { stage: 'STORY_COMPLETION', status: 'COMPLETED', result: story }
            : { message: '생성 요청을 찾을 수 없습니다.' },
        });
      });
      // 회원 목록은 서버가 정본이라 완성이 확정된 뒤에만 새 스토리를 돌려준다.
      await page.route(MY_STORIES, async (route) => {
        await route.fulfill({
          json: completed
            ? [
                {
                  ...story,
                  oneLineIntro: '',
                  turnCount: 0,
                  createdAt: new Date().toISOString(),
                },
              ]
            : [],
        });
      });
      await page.route(CREATE_CHAT, async (route) => {
        chatCount += 1;
        await route.fulfill({ status: 500 });
      });

      await reachAdditionalInfo(page);
      await page.getByRole('button', { name: '스토리 완성하기' }).click();
      await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));

      try {
        // 첫 조회뿐 아니라 다음 폴링 시점에도 POST 등록 전 404로 실패시키지 않는다.
        await page.waitForTimeout(5500);
        await expect(
          page.getByText(CREATION_PROGRESS_CARD_COPY.completingTitle),
        ).toBeVisible();
        await expect(
          page.getByText(TOAST_MESSAGE.STORY_COMPLETE_FAILED),
        ).toBeHidden();
        expect(lookupCount).toBe(0);
      } finally {
        releaseCompletion();
      }

      await expect(
        page.getByRole('link', { name: `${story.title} 상세 보기` }),
      ).toBeVisible();
      expect(completionCount).toBe(1);
      expect(lookupCount).toBeGreaterThan(0);
      expect(chatCount).toBe(0);
      await expect
        .poll(() =>
          page.evaluate(
            (keys) => keys.map((key) => localStorage.getItem(key)),
            [
              PENDING_CREATION_REQUEST_STORAGE_KEY,
              STORY_COMPLETION_REQUESTS_STORAGE_KEY,
            ],
          ),
        )
        .toEqual([null, null]);
    });
  }

  test('완성 중에도 새 스토리를 만들 수 있고 완성 중 카드가 요청 수만큼 표시되며 다른 초안은 남는다', async ({
    page,
  }) => {
    // 다른 세션의 키워드 초안은 완성 제출로 지워지지 않아야 한다.
    await seedPendingCreationRequests(page, [
      {
        stage: 'KEYWORD_DRAFT',
        requestId: 'keyword-other',
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
      },
    ]);
    await seedStoryCompletionRequests(page, [
      {
        stage: 'STORY_COMPLETION',
        requestId: 'completion-first',
        generationRequest: {
          requestId: 'generation-first',
          genreTagIds: [1],
          protagonist: { featureTagIds: [2] },
        },
        generationResult: { simpleCreationId: 2001, storylines: [] },
        selectedStoryline: { id: 201 },
        completionRequest: {
          requestId: 'completion-first',
          simpleCreationId: 2001,
          storylineId: 201,
        },
      },
    ]);
    await page.route(CREATION_REQUEST, async (route) => {
      await route.fulfill({
        json: { stage: 'STORY_COMPLETION', status: 'PENDING', result: null },
      });
    });
    await page.route(MY_STORIES, async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route(CREATE_STORY, async (route) => {
      await route.fulfill({
        status: 201,
        json: { id: 'story-second', title: '두 번째 스토리', genres: [] },
      });
    });

    await reachAdditionalInfo(page);
    await page.getByRole('button', { name: '스토리 완성하기' }).click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));

    const completingCards = page.getByRole('article', {
      name: CREATION_PROGRESS_CARD_COPY.completingTitle,
    });

    await expect(completingCards).toHaveCount(2);
    await expect(
      page.getByRole('link', { name: CREATE_STORY_FAB_COPY.accessibleLabel }),
    ).toBeVisible();
    // 제출한 세션의 초안만 사라지고 다른 초안 카드는 그대로 남는다.
    await expect(
      page.getByRole('article', {
        name: CREATION_PROGRESS_CARD_COPY.draftTitle,
      }),
    ).toHaveCount(1);
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? '[]'),
        PENDING_CREATION_REQUEST_STORAGE_KEY,
      ),
    ).toMatchObject([{ stage: 'KEYWORD_DRAFT', requestId: 'keyword-other' }]);
  });

  test('스토리 완성 실패는 제작 탭에서 토스트로 알리고 초안 카드로 되돌아가 입력을 유지한다', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });
    await page.route(STORYLINES, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(storylinesResponse),
      });
    });
    await page.route(CREATE_STORY, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'failed to create story' }),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();

    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    await page.getByRole('button', { name: '선택하기' }).click();

    const recommendation = page.getByRole('button', {
      name: '주인공은 비밀을 품고 있다',
    });
    const additionalInfoInput = page.locator(
      'textarea[aria-label="추가 정보 1"]',
    );

    await recommendation.click();
    await additionalInfoInput.fill('비밀은 사라진 왕국의 문장이다');
    await page.getByRole('button', { name: '스토리 완성하기' }).click();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(
      page.getByText(TOAST_MESSAGE.STORY_COMPLETE_FAILED),
    ).toBeVisible();
    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeVisible();

    await page
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.resume })
      .click();
    await expect(additionalInfoInput).toHaveValue(
      '비밀은 사라진 왕국의 문장이다',
    );
    await expect(recommendation).toHaveAttribute('aria-pressed', 'true');
  });

  test('추가 정보가 있으면 재선택을 경고하고 확정할 때만 입력을 초기화한다', async ({
    page,
  }) => {
    await reachAdditionalInfo(page);

    const recommendation = page.getByRole('button', {
      name: '주인공은 비밀을 품고 있다',
    });
    const additionalInfoInput = page.locator(
      'textarea[aria-label="추가 정보 1"]',
    );
    const reselectButton = page
      .getByRole('navigation')
      .getByRole('button', { name: '다시 선택하기' });

    await recommendation.click();
    await additionalInfoInput.fill('사라진 왕국의 비밀');
    await reselectButton.click();

    const warning = page.getByRole('alertdialog', {
      name: '스토리라인을 바꿀까요?',
    });

    await expect(
      warning.getByText('입력한 추가 정보는 모두 사라져요'),
    ).toBeVisible();
    await warning.getByRole('button', { name: '닫기' }).click();
    await expect(additionalInfoInput).toHaveValue('사라진 왕국의 비밀');
    await expect(recommendation).toHaveAttribute('aria-pressed', 'true');

    await reselectButton.click();
    await warning.getByRole('button', { name: '다시 선택하기' }).click();
    await expect(
      page.getByRole('button', { name: '선택하기', exact: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: '선택하기', exact: true }).click();
    await expect(
      page.locator('textarea[aria-label="추가 정보 1"]'),
    ).toHaveValue('');
    await expect(
      page.getByRole('button', { name: '주인공은 비밀을 품고 있다' }),
    ).toHaveAttribute('aria-pressed', 'false');

    // 초기 빈 입력 칸만 있으면 경고 없이 즉시 스토리라인 선택으로 돌아간다.
    await reselectButton.click();
    await expect(
      page.getByRole('button', { name: '선택하기', exact: true }),
    ).toBeVisible();
    await expect(warning).toBeHidden();
  });

  test('추가 정보 첫 렌더에서 선택한 스토리라인 박스 높이가 변하지 않는다', async ({
    page,
  }) => {
    await reachAdditionalInfo(page);

    const selectedStorylineBox = page.getByTestId('selected-storyline-content');
    const initialHeight = await selectedStorylineBox.evaluate(
      (element) => element.getBoundingClientRect().height,
    );

    await page.waitForTimeout(350);

    const settledHeight = await selectedStorylineBox.evaluate(
      (element) => element.getBoundingClientRect().height,
    );

    expect(settledHeight).toBe(initialHeight);
    await expect(page.getByRole('button', { name: '더보기' })).toBeVisible();
  });

  test('체험이 남아 있으면 추가 정보 하단에 스토리 완성 비용을 취소선 정가와 0 이프로 표시한다', async ({
    page,
  }) => {
    await reachAdditionalInfo(page);

    const creditCost = page.getByLabel(STORY_COMPLETION_CREDIT_COST_LABEL);
    const amount = creditCost.getByText(
      buildStoryCompletionCreditCostLabel(formatCreditAmount(0)),
      { exact: true },
    );

    await expect(creditCost).toBeVisible();
    await expect(creditCost.locator('s')).toHaveText(
      formatCreditAmount(CREDIT_POLICY_FIXTURE.storyCreationCost),
    );
    await expect(amount).toHaveCSS('font-weight', '700');
  });

  test('체험을 다 쓰면 추가 정보 하단에 스토리 완성 비용과 200 이프를 표시한다', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await mockTrials(page, { storyCreation: { used: 1, limit: 1 } });
    await reachAdditionalInfo(page);

    const creditCost = page.getByLabel(STORY_COMPLETION_CREDIT_COST_LABEL);
    const amount = creditCost.getByText(
      buildStoryCompletionCreditCostLabel(
        formatCreditAmount(CREDIT_POLICY_FIXTURE.storyCreationCost),
      ),
      { exact: true },
    );

    await expect(creditCost).toBeVisible();
    await expect(creditCost.locator('s')).toHaveCount(0);
    await expect(amount).toHaveCSS('font-weight', '700');
  });

  test('추가 정보 입력의 Tab은 삭제 버튼을 건너뛰고 다음 입력으로 이동한다 (KNK-999)', async ({
    page,
  }) => {
    await reachAdditionalInfo(page);
    await page.getByRole('button', { name: '정보 추가' }).click();

    const firstInput = page.getByRole('textbox', { name: '추가 정보 1' });
    const secondInput = page.getByRole('textbox', { name: '추가 정보 2' });
    const firstRemoveButton = page.getByRole('button', {
      name: '추가 정보 1 삭제',
    });

    await expect(firstRemoveButton).toHaveAttribute('tabindex', '-1');
    await firstInput.focus();
    await firstInput.press('Tab');
    await expect(secondInput).toBeFocused();
  });

  test('같은 완성 요청의 409는 실패로 끝내지 않고 저장한 requestId로 복구한다', async ({
    page,
  }) => {
    const completionRequestIds: string[] = [];

    await page.route(CREATE_STORY, async (route) => {
      const body = route.request().postDataJSON() as { requestId: string };

      completionRequestIds.push(body.requestId);
      await route.fulfill({
        status: completionRequestIds.length === 1 ? 500 : 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'completion is pending' }),
      });
    });
    await page.route(CREATION_REQUEST, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stage: 'STORY_COMPLETION',
          status: 'COMPLETED',
          result: {
            id: 'story-conflict-recovered',
            title: '409 복구 스토리',
            genres: ['판타지'],
          },
        }),
      });
    });
    await page.route(MY_STORIES, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'story-conflict-recovered',
            title: '409 복구 스토리',
            oneLineIntro: '',
            genres: ['판타지'],
            turnCount: 0,
            createdAt: new Date().toISOString(),
          },
        ]),
      });
    });
    await reachAdditionalInfo(page);

    // 첫 제출: 제작 탭 복귀 뒤 500이 도착하면 초안 카드로 되돌린다.
    await page.getByRole('button', { name: '스토리 완성하기' }).click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(
      page.getByText(TOAST_MESSAGE.STORY_COMPLETE_FAILED),
    ).toBeVisible();
    await page
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.resume })
      .click();

    // 같은 입력의 재제출은 requestId를 재사용하고, 409는 완성 중 카드로 남아 조회로 결과를 되찾는다.
    await page.getByRole('button', { name: '스토리 완성하기' }).click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));

    await expect(
      page.getByRole('link', { name: '409 복구 스토리 상세 보기' }),
    ).toBeVisible({ timeout: 10000 });
    expect(completionRequestIds).toHaveLength(2);
    expect(completionRequestIds[1]).toBe(completionRequestIds[0]);
  });

  test('스토리라인 생성 실패 시 첫 생성과 재생성을 구분해 안내한다', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });

    // 1·3번째 요청은 실패, 2번째 요청만 성공시켜 첫 생성 실패 → 재생성 성공 → 재생성 실패를 재현한다.
    let storylineRequestCount = 0;

    await page.route(STORYLINES, async (route) => {
      storylineRequestCount += 1;

      if (storylineRequestCount === 2) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(storylinesResponse),
        });

        return;
      }

      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'failed to generate storylines' }),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();

    // 첫 생성 실패: 재생성 문구가 아닌 첫 생성 실패 문구를 보여준다.
    await expect(page.getByText('스토리라인을 만들지 못했어요')).toBeVisible();
    await expect(
      page.getByText('스토리라인을 다시 만들지 못했어요'),
    ).toBeHidden();

    // 재생성 성공: 스토리라인이 표시된다.
    await page.getByRole('button', { name: '다시 만들기' }).click();
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();

    // 재생성 실패: 이전 결과가 남아 있으므로 재생성 실패 문구를 보여준다.
    await page.getByRole('button', { name: '다시 만들기' }).click();
    await expect(
      page.getByText('스토리라인을 다시 만들지 못했어요'),
    ).toBeVisible();
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
  });

  // 재생성은 전용 API가 없어 서버가 원본과의 관계를 알 수 없다. 프론트가 직전 시도의
  // requestId를 parentCreationId로 실어 Langfuse 여정을 잇는다(스펙 §3-8, 체인 방식).
  test('스토리라인 재생성이 직전 생성의 requestId를 부모로 실어 보낸다', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });

    const bodies: { requestId: string; parentCreationId: string | null }[] = [];

    await page.route(STORYLINES, async (route) => {
      bodies.push(route.request().postDataJSON());

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(storylinesResponse),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();

    const regenerateButton = page.getByRole('button', { name: '다시 만들기' });

    await regenerateButton.click();
    await expect.poll(() => bodies.length).toBe(2);
    await regenerateButton.click();
    await expect.poll(() => bodies.length).toBe(3);

    const [first, second, third] = bodies;

    // 최초 생성은 부모가 없다.
    expect(first.parentCreationId).toBeNull();

    // 재생성마다 새 requestId를 받고, 부모는 바로 직전 시도를 가리킨다.
    expect(second.requestId).not.toBe(first.requestId);
    expect(second.parentCreationId).toBe(first.requestId);

    // 체인이라 세 번째의 부모는 두 번째다 — 최초 루트를 계속 가리키지 않는다.
    expect(third.parentCreationId).toBe(second.requestId);
    expect(third.parentCreationId).not.toBe(first.requestId);
  });
});
