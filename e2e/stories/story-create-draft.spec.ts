import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';

import { seedPendingCreationRequest } from '../fixtures/storage';
import { expect, skipOnboarding, test } from '../fixtures/test';

// 임시 저장(draft, KNK-648): 뒤로 가기 이탈 시 제작 상태를 저장하고
// 홈 배너·재개 다이얼로그로 이어 만드는 흐름.
const TAGS = '**/api/v1/stories/simple/tags';
const STORYLINES = '**/api/v1/stories/simple/storylines';

const STORAGE_KEY = 'manyak:pending-creation-request';

const tags = [
  { id: 1, name: '판타지', category: 'GENRE' },
  { id: 2, name: '용감한', category: 'PROTAGONIST' },
];

const storylinesResponse = {
  simpleCreationId: 1001,
  selectedTags: [],
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
    selectedTagIds: [1, 2],
    customTags: [],
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

    // 홈에서 퍼널로 진입해야 이탈 확정(history.go(-2)) 후 홈으로 복귀한다.
    await page.goto('/');
    await page.getByRole('button', { name: '스토리 만들기' }).click();
    await expect(page).toHaveURL(/\/stories\/new$/);

    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();
    await expect(page.getByText('나중에 이어서 만들까요?')).toBeVisible();
    await expect(
      page.getByText('지금까지 만든 내용은 임시 저장돼요'),
    ).toBeVisible();
    await page.getByRole('button', { name: '나중에 만들기' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('만들다 만 스토리가 있어요')).toBeVisible();
    await page
      .getByRole('button', { name: '이어서 만들기', exact: true })
      .click();

    await expect(page).toHaveURL(/\/stories\/new$/);
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

    await page.goto('/stories/new');

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

    await page.goto('/stories/new');

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

  test('홈 배너에서 draft 문구를 표시하고 닫으면 폐기한다', async ({
    page,
  }) => {
    await seedPendingCreationRequest(page, draftRecord);

    await page.goto('/');

    await expect(page.getByText('만들다 만 스토리가 있어요')).toBeVisible();
    await page.getByRole('button', { name: '이어서 만들기 배너 닫기' }).click();

    await expect(page.getByText('만들다 만 스토리가 있어요')).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toBeNull();
  });
});
