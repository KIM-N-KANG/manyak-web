import { APP_PATH } from '@/constants/app-path';
import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';

import { seedPendingCreationRequest } from '../fixtures/storage';
import { expect, skipOnboarding, test } from '../fixtures/test';

// 임시 저장(draft, KNK-648): 뒤로 가기 이탈 시 제작 상태를 저장하고
// 제작 탭 배너·재개 다이얼로그로 이어 만드는 흐름.
const TAGS = '**/api/v1/stories/simple/tags';
const STORYLINES = '**/api/v1/stories/simple/storylines';

const STORAGE_KEY = 'manyak:pending-creation-request';

const tags = [
  { id: 1, name: '판타지', category: 'GENRE' },
  { id: 2, name: '용감한', category: 'PROTAGONIST' },
];

const storylinesResponse = {
  simpleCreationId: 1001,
  selectedTags: { genreTags: [], supportingCharacters: [] },
  storylines: [
    {
      id: 101,
      storyline: '첫 번째 이야기 흐름입니다.',
      recommendedInfos: [],
    },
    { id: 102, storyline: '두 번째 이야기 흐름입니다.', recommendedInfos: [] },
    { id: 103, storyline: '세 번째 이야기 흐름입니다.', recommendedInfos: [] },
  ],
};

const draftRecord: PendingCreationRequest = {
  stage: 'STORY_DRAFT',
  requestId: '33333333-3333-4333-8333-333333333333',
  step: 'storyline-select',
  generationRequest: {
    requestId: '11111111-1111-4111-8111-111111111111',
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

test.describe('스토리 임시 저장·재개', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });
  });

  test('키워드 단계에서 브라우저 뒤로 가기를 하면 제작 탭으로 이동한다 (KNK-988)', async ({
    page,
  }) => {
    await page.goto(APP_PATH.CREATOR.STORY);
    // 퍼널이 마운트돼야 브라우저 뒤로가기용 더미 히스토리가 설치된다.
    await expect(page.getByText('키워드를 선택해주세요')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.history.length))
      .toBeGreaterThan(2);
    await page.goBack();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.CREATE}$`));
  });

  test('스토리라인 생성 후 뒤로 가기로 나가면 임시 저장되고 배너로 복원한다', async ({
    page,
  }) => {
    await page.route(STORYLINES, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(storylinesResponse),
      });
    });

    await page.goto(APP_PATH.MAIN.CREATE);
    await page.getByRole('button', { name: '스토리 만들기' }).click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.CREATOR.STORY}$`));

    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();

    // 내용이 보존되는 이탈이므로 확인 다이얼로그 없이 바로 나가고 토스트로 알린다.
    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();
    await expect(page.getByText('스토리가 임시 저장되었어요')).toBeVisible();
    await expect(page.getByText('스토리를 그만 만들까요?')).toBeHidden();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.CREATE}$`));
    await expect(page.getByText('만들고 있는 스토리가 있어요')).toBeVisible();
    await page
      .getByRole('button', { name: '이어서 만들기', exact: true })
      .click();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.CREATOR.STORY}$`));
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    await expect(page.getByRole('button', { name: '선택하기' })).toBeVisible();

    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toBeNull();
  });

  test('draft가 있는 상태로 일반 진입하면 재개 다이얼로그를 띄우고 이어서 만들기를 복원한다', async ({
    page,
  }) => {
    await seedPendingCreationRequest(page, draftRecord);

    await page.goto(APP_PATH.CREATOR.STORY);

    await expect(page.getByText('만들고 있는 스토리가 있어요')).toBeVisible();
    await page.getByRole('button', { name: '이어서 만들기' }).click();

    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toBeNull();
  });

  test('재개 다이얼로그에서 새로 만들기를 고르면 draft를 버리고 키워드부터 시작한다', async ({
    page,
  }) => {
    await seedPendingCreationRequest(page, draftRecord);

    await page.goto(APP_PATH.CREATOR.STORY);

    await expect(page.getByText('만들고 있는 스토리가 있어요')).toBeVisible();
    await page.getByRole('button', { name: '새로 만들기' }).click();

    await expect(page.getByRole('tab', { name: /장르/ })).toBeVisible();
    await expect(page.getByText('만들고 있는 스토리가 있어요')).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toBeNull();
  });

  test('제작 탭 배너에서 draft 문구를 표시하고 닫으면 폐기한다', async ({
    page,
  }) => {
    await seedPendingCreationRequest(page, draftRecord);

    await page.goto(APP_PATH.MAIN.CREATE);

    await expect(page.getByText('만들고 있는 스토리가 있어요')).toBeVisible();
    await page.getByRole('button', { name: '이어서 만들기 배너 닫기' }).click();

    await expect(page.getByText('만들고 있는 스토리가 있어요')).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toBeNull();
  });
});
