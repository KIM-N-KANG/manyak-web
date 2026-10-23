import type { Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import {
  CREATE_TUTORIAL_COPY,
  CREATE_TUTORIAL_STORAGE_KEY,
  type CreateTutorialStage,
  getCreateTutorialMessage,
} from '@/features/stories/_shared/constants/create-tutorial';
import { STORYLINE_GENERATE_LABEL } from '@/features/stories/new/constants';
import { CREATION_PROGRESS_CARD_COPY } from '@/features/studio/menu/constants';

import { GENRE_CATALOG_FIXTURE } from '../fixtures/api-mock';
import { completeStory } from '../fixtures/story-generation';
import { expect, mockMemberSession, test } from '../fixtures/test';

// 기본 픽스처는 안내를 끈다. 이 스펙만 켜고 저장값 없이 시작한다.
test.use({ createTutorial: true });

const TAGS = '**/api/v1/stories/simple/tags';
const STORYLINES = '**/api/v1/stories/simple/storylines';
const CREATE_STORY = '**/api/v1/stories/simple';
const CREATION_REQUEST = '**/api/v1/stories/simple/creation-requests/*';
const MY_STORIES = '**/api/v1/users/me/stories*';

// 장르 칩은 제공 장르 카탈로그의 대표 장르다.
const GENRES = GENRE_CATALOG_FIXTURE.featuredGenres.map(({ name }) => name);

test.beforeEach(async ({ page }) => {
  await mockMemberSession(page);
  await page.route(TAGS, (route) =>
    route.fulfill({
      json: [{ id: 2, name: '용감한', category: 'PROTAGONIST' }],
    }),
  );
  await page.route(STORYLINES, (route) =>
    route.fulfill({
      status: 201,
      json: {
        simpleCreationId: 1001,
        selectedTags: { genreTags: [], supportingCharacters: [] },
        storylines: [101, 102, 103].map((id) => ({
          id,
          storyline: `${id}번 이야기 흐름입니다.`,
          recommendedInfos: [],
        })),
      },
    }),
  );
  await page.route(CREATE_STORY, (route) =>
    route.fulfill({
      status: 201,
      json: { id: 'story-new', title: '새 스토리', genres: GENRES },
    }),
  );
  // 완성 중 카드가 제작 탭에 남아 있도록 완성 조회는 끝나지 않는다.
  await page.route(CREATION_REQUEST, (route) =>
    route.fulfill({
      json: { stage: 'STORY_COMPLETION', status: 'PENDING', result: null },
    }),
  );
  await page.route(MY_STORIES, (route) => route.fulfill({ json: [] }));
});

const tutorial = (page: Page) =>
  page.getByRole('dialog', { name: CREATE_TUTORIAL_COPY.label });

async function expectStage(
  page: Page,
  stage: CreateTutorialStage,
  genres?: string[],
) {
  await expect(tutorial(page)).toHaveAccessibleDescription(
    getCreateTutorialMessage(stage, genres).replace(/\n/g, ' '),
  );
}

const readStored = (page: Page) =>
  page.evaluate(
    (key) => window.localStorage.getItem(key),
    CREATE_TUTORIAL_STORAGE_KEY,
  );

test('처음 들어오면 단계마다 안내하고 제작 탭에서 오리지널 스토리로 보낸다 (STORY-TUTORIAL-01~05)', async ({
  page,
}) => {
  await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

  await expectStage(page, 'intro');
  await expect(
    tutorial(page).getByRole('button', { name: CREATE_TUTORIAL_COPY.skip }),
  ).toBeVisible();
  await tutorial(page)
    .getByRole('button', { name: CREATE_TUTORIAL_COPY.start })
    .click();

  await expectStage(page, 'keyword');
  await expect(tutorial(page).getByRole('button')).toHaveCount(1);
  await tutorial(page)
    .getByRole('button', { name: CREATE_TUTORIAL_COPY.confirm })
    .click();
  await expect(tutorial(page)).toBeHidden();

  await page.getByRole('button', { name: GENRES[0], exact: true }).click();
  await page.getByRole('button', { name: GENRES[1], exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '용감한', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page
    .getByRole('button', { name: STORYLINE_GENERATE_LABEL, exact: true })
    .click();

  // 고른 장르를 문구에 넣고, 마지막 장르의 받침에 맞춰 "로" 또는 "으로"를 붙인다.
  await expectStage(page, 'storyline', GENRES);
  await expect(tutorial(page)).toContainText('판타지, 로맨스로 만든');
  await tutorial(page)
    .getByRole('button', { name: CREATE_TUTORIAL_COPY.confirm })
    .click();
  await page.getByRole('button', { name: '선택하기' }).click();

  await expectStage(page, 'additional-info');
  await tutorial(page)
    .getByRole('button', { name: CREATE_TUTORIAL_COPY.confirm })
    .click();
  await expect(tutorial(page)).toBeHidden();
  await completeStory(page);

  await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
  await expect(
    page.getByText(CREATION_PROGRESS_CARD_COPY.completingTitle),
  ).toBeVisible();
  await expectStage(page, 'completing');
  await tutorial(page)
    .getByRole('button', { name: CREATE_TUTORIAL_COPY.originals })
    .click();

  await expect(page).toHaveURL(/\/$/);
  await expect(tutorial(page)).toHaveCount(0);
  expect(await readStored(page)).toBe('done');
});

test('건너뛰면 남은 단계를 모두 보이지 않는다 (STORY-TUTORIAL-06)', async ({
  page,
}) => {
  await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
  await expectStage(page, 'intro');
  await tutorial(page)
    .getByRole('button', { name: CREATE_TUTORIAL_COPY.skip })
    .click();

  await expect(tutorial(page)).toBeHidden();
  expect(await readStored(page)).toBe('done');
});

test('시작한 뒤 뒤로가기는 화면을 떠나지 않고 지금 단계만 마친다 (STORY-TUTORIAL-07)', async ({
  page,
}) => {
  await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
  await tutorial(page)
    .getByRole('button', { name: CREATE_TUTORIAL_COPY.start })
    .click();
  await expectStage(page, 'keyword');

  await page.goBack();

  await expect(tutorial(page)).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`));
  expect(await readStored(page)).toBe('keyword');
});
