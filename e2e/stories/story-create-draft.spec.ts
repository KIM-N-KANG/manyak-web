import { APP_PATH } from '@/constants/app-path';
import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';

import { seedPendingCreationRequest } from '../fixtures/storage';
import { expect, skipOnboarding, test } from '../fixtures/test';

// 편집 자동 저장(draft): 마지막 변경 300ms 뒤 제작 상태를 저장하고
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
      recommendedInfos: [{ id: 1, text: '주인공은 비밀을 품고 있다' }],
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
    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    // 퍼널이 마운트돼야 브라우저 뒤로가기용 더미 히스토리가 설치된다.
    await expect(page.getByText('키워드를 선택해주세요')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.history.length))
      .toBeGreaterThan(2);
    await page.goBack();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
  });

  test('키워드 입력을 자동 저장하고 새로고침 후 첫 탭에서 복원한다', async ({
    page,
  }) => {
    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await page.getByRole('button', { name: '판타지' }).click();
    await expect(page.getByText('임시 저장중', { exact: true })).toBeVisible();
    await expect(page.getByText('임시 저장됨', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('textbox', { name: '주인공 이름' }).fill('마냑');
    await page.getByRole('button', { name: '용감한' }).click();
    await expect(page.getByText('임시 저장됨', { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText('만들고 있는 스토리가 있어요')).toBeVisible();
    await page.getByRole('button', { name: '이어서 만들기' }).click();

    await expect(page.getByRole('tab', { name: /장르/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('button', { name: '판타지' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('tab', { name: /주인공 특징/ }).click();
    await expect(
      page.getByRole('textbox', { name: '주인공 이름' }),
    ).toHaveValue('마냑');
    await expect(page.getByRole('button', { name: '용감한' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText('임시 저장됨', { exact: true })).toBeVisible();
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

    await page.goto(APP_PATH.MAIN.STUDIO);
    await page.getByRole('button', { name: '스토리 만들기' }).click();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );

    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();

    // 생성 성공 시 이미 저장돼 있으므로 확인 다이얼로그·저장 토스트 없이 바로 나간다.
    await page.getByRole('button', { name: '스토리 만들기 닫기' }).click();
    await expect(page.getByText('스토리가 임시 저장되었어요')).toHaveCount(0);
    await expect(page.getByText('스토리를 그만 만들까요?')).toBeHidden();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(page.getByText('만들고 있는 스토리가 있어요')).toBeVisible();
    await page
      .getByRole('button', { name: '이어서 만들기', exact: true })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    await expect(page.getByRole('button', { name: '선택하기' })).toBeVisible();

    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toContain('"stage":"STORY_DRAFT"');
  });

  test('추가 정보 편집을 자동 저장하고 새로고침 뒤 입력과 추천을 복원한다', async ({
    page,
  }) => {
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
    await page.getByRole('button', { name: '선택하기' }).click();

    const additionalInfoInput = page.locator(
      'textarea[aria-label="추가 정보 1"]',
    );
    const recommendation = page.getByRole('button', {
      name: '주인공은 비밀을 품고 있다',
    });

    await additionalInfoInput.fill('사라진 왕국의 비밀');
    await recommendation.click();
    await expect(page.getByText('임시 저장됨', { exact: true })).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: '이어서 만들기' }).click();

    await expect(
      page.locator('textarea[aria-label="추가 정보 1"]'),
    ).toHaveValue('사라진 왕국의 비밀');
    await expect(
      page.getByRole('button', { name: '주인공은 비밀을 품고 있다' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toContain('"stage":"STORY_DRAFT"');
  });

  test('draft가 있을 때 제작 탭의 스토리 만들기를 누르면 이동 전에 재개 다이얼로그를 띄운다', async ({
    page,
  }) => {
    await seedPendingCreationRequest(page, draftRecord);

    await page.goto(APP_PATH.MAIN.STUDIO);
    await page.getByRole('button', { name: '스토리 만들기' }).click();

    const resumeDialog = page.getByRole('alertdialog');

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(
      resumeDialog.getByText('만들고 있는 스토리가 있어요'),
    ).toBeVisible();

    const continueButton = resumeDialog.getByRole('button', {
      name: '이어서 만들기',
    });
    const discardButton = resumeDialog.getByRole('button', {
      name: '새로 만들기',
    });

    await expect(continueButton).toHaveClass(/bg-primary/);
    await expect(discardButton).toHaveClass(/bg-muted/);
    await continueButton.click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toContain('"stage":"STORY_DRAFT"');
  });

  test('제작 탭 재개 다이얼로그에서 새로 만들기를 고르면 이동 전에 draft를 폐기한다', async ({
    page,
  }) => {
    await seedPendingCreationRequest(page, draftRecord);

    await page.goto(APP_PATH.MAIN.STUDIO);
    await page.getByRole('button', { name: '스토리 만들기' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: '새로 만들기' })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await expect(page.getByRole('tab', { name: /장르/ })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toBeNull();
  });

  test('제작 탭 재개 다이얼로그는 바깥 영역을 누르면 draft를 유지하고 닫힌다', async ({
    page,
  }) => {
    await seedPendingCreationRequest(page, draftRecord);

    await page.goto(APP_PATH.MAIN.STUDIO);
    await page.getByRole('button', { name: '스토리 만들기' }).click();

    const resumeDialog = page.getByRole('alertdialog');

    await expect(resumeDialog).toBeVisible();
    await page
      .locator('[data-slot="dialog-overlay"]')
      .click({ position: { x: 4, y: 4 } });

    await expect(resumeDialog).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toContain('"stage":"STORY_DRAFT"');
  });

  test('draft가 있는 상태로 딥링크 진입하면 퍼널에서 재개 다이얼로그를 띄운다', async ({
    page,
  }) => {
    await seedPendingCreationRequest(page, draftRecord);

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await expect(page.getByText('만들고 있는 스토리가 있어요')).toBeVisible();
    await page.getByRole('button', { name: '이어서 만들기' }).click();

    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toContain('"stage":"STORY_DRAFT"');
  });

  test('재개 다이얼로그에서 새로 만들기를 고르면 draft를 버리고 키워드부터 시작한다', async ({
    page,
  }) => {
    await seedPendingCreationRequest(page, draftRecord);

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

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

  test('제작 탭 배너에서 draft 문구와 이어서 만들기만 표시한다', async ({
    page,
  }) => {
    await seedPendingCreationRequest(page, draftRecord);

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText('만들고 있는 스토리가 있어요')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '이어서 만들기 배너 닫기' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: '이어서 만들기', exact: true }),
    ).toHaveClass(/text-primary/);
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .not.toBeNull();
  });
});
