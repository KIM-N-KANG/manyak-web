import type { Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import { STORY_CREATE_BACK_DIALOG_COPY } from '@/features/stories/new/components/header/story-create-back-dialog';
import { PROTAGONIST_CATEGORY } from '@/features/stories/new/constants';
import {
  CREATE_STORY_FAB_COPY,
  CREATION_PROGRESS_CARD_COPY,
} from '@/features/studio/menu/constants';

import { seedPendingCreationRequests } from '../fixtures/storage';
import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';

// 편집 자동 저장(draft): 마지막 변경 300ms 뒤 제작 상태를 저장하고
// 제작 탭 진행 카드의 "이어서 만들기"로 이어 만드는 흐름. 초안은 여러 건 공존하고
// 새 제작·딥링크 진입은 묻지 않고 새 세션으로 시작한다.
const TAGS = '**/api/v1/stories/simple/tags';
const STORYLINES = '**/api/v1/stories/simple/storylines';

const STORAGE_KEY = 'manyak:pending-creation-request';

/** 저장된 편집 초안 목록의 stage 배열을 읽는다. */
const readDraftStages = (page: Page) =>
  page.evaluate((key) => {
    const raw = localStorage.getItem(key);

    return raw
      ? (JSON.parse(raw) as { stage: string }[]).map(({ stage }) => stage)
      : [];
  }, STORAGE_KEY);

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
  // 제작은 회원 전용이라 회원 세션으로 진행한다.
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
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

  test('키워드 입력이 있으면 헤더 X에서 확인 다이얼로그를 거쳐 제작 탭으로 나간다', async ({
    page,
  }) => {
    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await page.getByRole('button', { name: '판타지' }).click();
    await expect(page.getByText('임시 저장됨', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: '스토리 만들기 닫기' }).click();

    const savedDialog = page.getByRole('alertdialog', {
      name: STORY_CREATE_BACK_DIALOG_COPY.saved.title,
    });

    await expect(savedDialog).toBeVisible();

    // 닫기는 머무르고 입력을 유지한다.
    await savedDialog
      .getByRole('button', { name: STORY_CREATE_BACK_DIALOG_COPY.saved.cancel })
      .click();
    await expect(savedDialog).toBeHidden();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await expect(page.getByRole('button', { name: '판타지' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByRole('button', { name: '스토리 만들기 닫기' }).click();
    await savedDialog
      .getByRole('button', {
        name: STORY_CREATE_BACK_DIALOG_COPY.saved.confirm,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeVisible();
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

    // 새로고침·딥링크는 새 세션이므로 제작 탭 카드로 재개한다.
    await page.goto(APP_PATH.MAIN.STUDIO);
    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeVisible();
    await page
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.resume })
      .click();

    await expect(page.getByRole('tab', { name: /장르/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('button', { name: '판타지' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('tab', { name: PROTAGONIST_CATEGORY.label }).click();
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
    await page
      .getByRole('link', { name: CREATE_STORY_FAB_COPY.accessibleLabel })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );

    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();

    // 생성 성공 시 이미 저장돼 있으므로 소실 경고가 아니라 이어서 만들 수 있다는
    // 확인 다이얼로그를 띄우고, 확정하면 저장 토스트 없이 나간다.
    await page.getByRole('button', { name: '스토리 만들기 닫기' }).click();

    const savedDialog = page.getByRole('alertdialog', {
      name: STORY_CREATE_BACK_DIALOG_COPY.saved.title,
    });

    await expect(savedDialog).toBeVisible();
    await expect(
      savedDialog.getByText(STORY_CREATE_BACK_DIALOG_COPY.saved.description),
    ).toBeVisible();
    await savedDialog
      .getByRole('button', {
        name: STORY_CREATE_BACK_DIALOG_COPY.saved.confirm,
      })
      .click();
    await expect(page.getByText('스토리가 임시 저장되었어요')).toHaveCount(0);

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeVisible();
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

    await page.goto(APP_PATH.MAIN.STUDIO);
    await page
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.resume })
      .click();

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

  test('draft가 있어도 FAB는 묻지 않고 새 세션으로 진입하며 기존 초안을 유지한다', async ({
    page,
  }) => {
    await seedPendingCreationRequests(page, [draftRecord]);

    await page.goto(APP_PATH.MAIN.STUDIO);
    await page
      .getByRole('link', { name: CREATE_STORY_FAB_COPY.accessibleLabel })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /장르/ })).toBeVisible();
    await expect.poll(() => readDraftStages(page)).toEqual(['STORY_DRAFT']);
  });

  test('draft가 있는 상태로 딥링크 진입하면 키워드부터 시작하고 기존 초안을 유지한다', async ({
    page,
  }) => {
    await seedPendingCreationRequests(page, [draftRecord]);

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await expect(page.getByRole('tab', { name: /장르/ })).toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toHaveCount(0);
    await expect.poll(() => readDraftStages(page)).toEqual(['STORY_DRAFT']);
  });

  test('새 세션에서 키워드를 입력하면 기존 초안 옆에 새 초안이 추가된다', async ({
    page,
  }) => {
    await seedPendingCreationRequests(page, [draftRecord]);

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await page.getByRole('button', { name: '판타지' }).click();
    await expect(page.getByText('임시 저장됨', { exact: true })).toBeVisible();

    await expect
      .poll(() => readDraftStages(page))
      .toEqual(['STORY_DRAFT', 'KEYWORD_DRAFT']);

    // 시드 initScript가 새 문서 로드마다 다시 심으므로 클라이언트 전환으로 제작 탭에 간다.
    await page.getByRole('button', { name: '스토리 만들기 닫기' }).click();
    await page
      .getByRole('alertdialog', {
        name: STORY_CREATE_BACK_DIALOG_COPY.saved.title,
      })
      .getByRole('button', {
        name: STORY_CREATE_BACK_DIALOG_COPY.saved.confirm,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(
      page.getByRole('article', {
        name: CREATION_PROGRESS_CARD_COPY.draftTitle,
      }),
    ).toHaveCount(2);
  });

  test('초안이 두 개면 각 카드의 이어서 만들기가 자기 내용을 복원한다', async ({
    page,
  }) => {
    const keywordDraft: PendingCreationRequest = {
      stage: 'KEYWORD_DRAFT',
      requestId: '44444444-4444-4444-8444-444444444444',
      snapshot: {
        selectedGenreTagIds: [1],
        customGenreTags: [],
        protagonist: {
          name: '두 번째 주인공',
          gender: null,
          selectedTagIds: [],
          customTags: [],
        },
        supportingCharacters: [],
      },
    };

    await seedPendingCreationRequests(page, [draftRecord, keywordDraft]);

    await page.goto(APP_PATH.MAIN.STUDIO);

    const cards = page.getByRole('article', {
      name: CREATION_PROGRESS_CARD_COPY.draftTitle,
    });

    await expect(cards).toHaveCount(2);
    // 카드는 각 초안이 멈춘 단계를 설명한다.
    await expect(
      cards
        .nth(0)
        .getByText(
          CREATION_PROGRESS_CARD_COPY.draftDescription['storyline-select'],
        ),
    ).toBeVisible();
    await expect(
      cards
        .nth(1)
        .getByText(CREATION_PROGRESS_CARD_COPY.draftDescription.keyword),
    ).toBeVisible();

    // 두 번째 카드(키워드 초안)를 재개하면 키워드 입력이 복원된다.
    await cards
      .nth(1)
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.resume })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await page.getByRole('tab', { name: PROTAGONIST_CATEGORY.label }).click();
    await expect(
      page.getByRole('textbox', { name: '주인공 이름' }),
    ).toHaveValue('두 번째 주인공');

    // 첫 번째 카드(스토리 초안)를 재개하면 생성 결과가 복원되고 두 초안 모두 남는다.
    await page.goto(APP_PATH.MAIN.STUDIO);
    await cards
      .nth(0)
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.resume })
      .click();
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    await expect
      .poll(() => readDraftStages(page))
      .toEqual(['STORY_DRAFT', 'KEYWORD_DRAFT']);
  });

  test('제작 탭 진행 카드는 닫기 없이 이어서 만들기와 더보기만 표시한다', async ({
    page,
  }) => {
    await seedPendingCreationRequests(page, [draftRecord]);

    await page.goto(APP_PATH.MAIN.STUDIO);

    const card = page.getByRole('article', {
      name: CREATION_PROGRESS_CARD_COPY.draftTitle,
    });

    await expect(
      card.getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeVisible();
    await expect(
      card.getByText(
        CREATION_PROGRESS_CARD_COPY.draftDescription['storyline-select'],
      ),
    ).toBeVisible();
    await expect(
      card.getByRole('button', { name: '이어서 만들기 배너 닫기' }),
    ).toHaveCount(0);
    await expect(
      card.getByRole('button', {
        name: CREATION_PROGRESS_CARD_COPY.resume,
        exact: true,
      }),
    ).toHaveClass(/bg-primary/);
    await expect(
      card.getByRole('button', {
        name: CREATION_PROGRESS_CARD_COPY.optionsTrigger,
      }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .not.toBeNull();
  });

  test('진행 카드 더보기에서 삭제하면 확인 뒤 저장본을 지우고 카드를 숨긴다', async ({
    page,
  }) => {
    await seedPendingCreationRequests(page, [draftRecord]);

    await page.goto(APP_PATH.MAIN.STUDIO);

    await page
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.optionsTrigger })
      .click();
    await page
      .getByRole('menuitem', { name: CREATION_PROGRESS_CARD_COPY.delete })
      .click();
    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.deleteConfirmTitle),
    ).toBeVisible();
    await page
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.delete })
      .click();

    // 옵션 시트 머리글에도 같은 제목이 있으므로 카드(article) 안으로 좁힌다.
    await expect(
      page
        .getByRole('article')
        .getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toBeNull();
  });
});
