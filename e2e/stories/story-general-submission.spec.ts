import type { Page, Route } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  GENERAL_STORY_CREATE_COPY,
  GENERAL_STORY_REVIEW_COPY,
  GENERAL_STORY_START_COPY,
  GENERAL_STORY_TEXT_FIELDS,
} from '@/features/studio/general/constants';
import { SUBMISSION_CARD_COPY } from '@/features/studio/menu/constants';

import { mockMemberSession } from '../fixtures/auth';
import { expect, skipOnboarding, test } from '../fixtures/test';

const PROLOGUE_REASON = '마약 사용을 직접 권장합니다.';

const PAYLOAD = {
  title: '노선도에 없는 역',
  oneLineIntro: '막차에서 내린 곳',
  description: '',
  genres: ['판타지'],
  visibility: 'PRIVATE',
  storySettings: {
    worldSetting: '# 세계관\n막차 뒤에만 열리는 역',
    ruleSetting:
      '# 전개 규칙\n긴장감 있게 전개한다\n\n# 분량 배분\n묘사 5 : 대사 5',
    userRoleSetting:
      '# 주인공\n## 호칭\n윤해솔\n## 성별\n여성\n겁이 많은 회사원',
    characterSetting: '# 등장인물\n\n## 도하람\n### 성별\n여성',
  },
  startSettings: [
    {
      id: null,
      name: '승강장',
      prologue: '불 꺼진 승강장에 내렸다',
      startSituation: '열차가 떠나고 혼자 남았다',
      suggestedInputs: ['추천 입력 1', '추천 입력 2', '추천 입력 3'],
      endings: [],
    },
  ],
  mainEvents: [],
  thumbnailObjectKey: null,
  thumbnailUrl: null,
  characters: [{ id: null, name: '도하람', images: [] }],
};

const submission = (
  submissionId: string,
  status: 'PENDING' | 'REJECTED' | 'FAILED',
  extra: Record<string, unknown> = {},
) => ({
  submissionId,
  storyId: null,
  kind: 'CREATE',
  status,
  issues: [],
  imageErrors: [],
  errorCode: null,
  createdAt: '2026-09-29T03:00:00Z',
  updatedAt: '2026-09-29T03:00:00Z',
  decidedAt: null,
  payload: { ...PAYLOAD, title: `${PAYLOAD.title} ${submissionId}` },
  ...extra,
});

const REJECTED = submission('rejected', 'REJECTED', {
  issues: [
    {
      path: 'startSettings[0].prologue',
      type: 'TEXT',
      rule: 'DRUGS',
      reason: PROLOGUE_REASON,
    },
  ],
});

/** 제출본 목록 요청(`GET /stories/submissions?limit=`)만 고른다. 상세·재제출 경로는 제외한다. */
const isSubmissionList = (url: URL) =>
  url.pathname === '/api/v1/stories/submissions';

async function openStudio(page: Page, list: unknown[]) {
  await skipOnboarding(page);
  await mockMemberSession(page);
  await page.route(isSubmissionList, (route: Route) =>
    route.fulfill({ json: list }),
  );
  await page.goto(APP_PATH.MAIN.STUDIO);
}

test.describe('제작 탭 검수 제출본', () => {
  test('검토 중·반려·실패한 제출본을 상태별 카드로 보이고, 검토 중은 수정 없이 등록을 취소할 수 있다 (STORY-SUBMISSION-01)', async ({
    page,
  }) => {
    const deleted: string[] = [];
    let list: unknown[] = [
      submission('pending', 'PENDING'),
      REJECTED,
      submission('failed', 'FAILED', {
        errorCode: 'IMAGE_UNREADABLE',
        imageErrors: [{ path: 'thumbnailUrl', errorCode: 'IMAGE_UNREADABLE' }],
      }),
    ];

    await page.route('**/api/v1/stories/submissions/pending', async (route) => {
      deleted.push(route.request().method());
      list = list.slice(1);
      await route.fulfill({ status: 204 });
    });
    await skipOnboarding(page);
    await mockMemberSession(page);
    await page.route(isSubmissionList, (route: Route) =>
      route.fulfill({ json: list }),
    );
    await page.goto(APP_PATH.MAIN.STUDIO);

    const card = (id: string) =>
      page.getByRole('article', { name: `${PAYLOAD.title} ${id}` });

    await expect(card('pending')).toContainText(
      SUBMISSION_CARD_COPY.badge.PENDING,
    );
    await expect(card('pending')).toContainText(
      SUBMISSION_CARD_COPY.description.PENDING,
    );
    await expect(
      card('pending').getByRole('button', { name: SUBMISSION_CARD_COPY.edit }),
    ).toHaveCount(0);
    await expect(card('rejected')).toContainText(
      SUBMISSION_CARD_COPY.description.rejectedWithCount(1),
    );
    await expect(card('failed')).toContainText(
      SUBMISSION_CARD_COPY.description.failedImage,
    );
    await expect(
      card('failed').getByRole('button', { name: SUBMISSION_CARD_COPY.edit }),
    ).toBeVisible();

    await card('pending')
      .getByRole('button', { name: SUBMISSION_CARD_COPY.optionsTrigger })
      .click();
    await page
      .getByRole('menuitem', { name: SUBMISSION_CARD_COPY.cancel })
      .click();
    await page
      .getByRole('button', { name: SUBMISSION_CARD_COPY.cancel })
      .click();

    await expect(
      page.getByText(TOAST_MESSAGE.STORY_REGISTER_CANCELED),
    ).toBeVisible();
    await expect(card('pending')).toHaveCount(0);
    expect(deleted).toEqual(['DELETE']);
  });

  test('반려 카드의 수정하기는 제출본 내용으로 폼을 열어 사유를 칸에 보이고, 고치면 사유를 내리며 같은 제출본으로 재제출한다 (STORY-SUBMISSION-02)', async ({
    page,
  }) => {
    const resubmits: Record<string, unknown>[] = [];

    await page.route('**/api/v1/stories/simple/tags', (route) =>
      route.fulfill({ json: [{ id: 1, name: '판타지', category: 'GENRE' }] }),
    );
    await page.route(
      '**/api/v1/stories/submissions/rejected',
      async (route) => {
        if (route.request().method() === 'PUT') {
          resubmits.push(
            route.request().postDataJSON() as Record<string, unknown>,
          );
          await route.fulfill({
            status: 202,
            json: { submissionId: 'rejected', status: 'PENDING' },
          });

          return;
        }

        await route.fulfill({
          json:
            resubmits.length > 0
              ? { ...REJECTED, status: 'PENDING' }
              : REJECTED,
        });
      },
    );
    await openStudio(page, [REJECTED]);
    await page
      .getByRole('article', { name: `${PAYLOAD.title} rejected` })
      .getByRole('button', { name: SUBMISSION_CARD_COPY.edit })
      .click();

    await expect(page).toHaveURL(new RegExp(`\\?submissionId=rejected$`));
    await expect(
      page.getByRole('status', {
        name: GENERAL_STORY_REVIEW_COPY.rejectedTitle,
        exact: true,
      }),
    ).toBeVisible();
    // 첫 사유가 있는 시작 상황 설정 탭으로 연다.
    await expect(
      page.locator('[role="tab"][data-tab-value="start"]'),
    ).toHaveAttribute('aria-selected', 'true');

    const prologue = page.getByLabel(GENERAL_STORY_START_COPY.prologue.label);

    await expect(prologue).toHaveValue('불 꺼진 승강장에 내렸다');
    await expect(prologue).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText(PROLOGUE_REASON)).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: GENERAL_STORY_CREATE_COPY.draftSave,
        exact: true,
      }),
    ).toBeDisabled();

    await prologue.fill('불 꺼진 승강장에 혼자 내렸다');
    await expect(page.getByText(PROLOGUE_REASON)).toHaveCount(0);

    await page.locator('[role="tab"][data-tab-value="publish"]').click();
    await page
      .getByRole('button', {
        name: GENERAL_STORY_CREATE_COPY.register,
        exact: true,
      })
      .click();
    await expect.poll(() => resubmits.length).toBe(1);
    expect(resubmits[0]).toMatchObject({
      title: `${PAYLOAD.title} rejected`,
      genres: ['판타지'],
      startSettings: [{ prologue: '불 꺼진 승강장에 혼자 내렸다' }],
    });
    await expect(
      page.getByRole('status', {
        name: GENERAL_STORY_REVIEW_COPY.rejectedTitle,
        exact: true,
      }),
    ).toHaveCount(0);
  });

  test('고칠 수 없는 제출본 주소로 들어오면 제작 탭으로 보내 안내한다 (STORY-SUBMISSION-03)', async ({
    page,
  }) => {
    await page.route('**/api/v1/stories/submissions/pending', (route) =>
      route.fulfill({ json: submission('pending', 'PENDING') }),
    );
    await page.route('**/api/v1/stories/submissions/missing', (route) =>
      route.fulfill({ status: 404, json: { status: 404 } }),
    );
    await skipOnboarding(page);
    await mockMemberSession(page);
    await page.goto(APP_PATH.STUDIO.STORY.GENERAL_SUBMISSION('pending'));

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(
      page.getByText(TOAST_MESSAGE.STORY_SUBMISSION_PENDING),
    ).toBeVisible();

    await page.goto(APP_PATH.STUDIO.STORY.GENERAL_SUBMISSION('missing'));
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(
      page.getByText(TOAST_MESSAGE.STORY_SUBMISSION_LOAD_FAILED),
    ).toBeVisible();
    await expect(
      page.getByLabel(GENERAL_STORY_TEXT_FIELDS.title.label),
    ).toHaveCount(0);
  });
});
