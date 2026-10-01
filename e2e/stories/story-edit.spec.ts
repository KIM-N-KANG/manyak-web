import type { Page, Route } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { STORY_REPORT_COPY } from '@/features/stories/_shared/constants/story-report';
import {
  GENERAL_STORY_CHARACTER_COPY,
  GENERAL_STORY_COVER_COPY,
  GENERAL_STORY_EDIT_COPY,
  GENERAL_STORY_REVIEW_COPY,
  GENERAL_STORY_TABS,
  GENERAL_STORY_TEXT_FIELDS,
} from '@/features/studio/general/constants';

import { mockGuestSession, mockMemberSession } from '../fixtures/auth';
import { expect, skipOnboarding, test } from '../fixtures/test';

const STORY_ID = 's1';
const STORY_DETAIL = `**/api/v1/stories/${STORY_ID}`;
const EDIT_FORM_URL = `**/api/v1/stories/${STORY_ID}/edit`;
const SUBMISSION_URL = '**/api/v1/stories/submissions/sub-1';
const PUBLISH_TAB = GENERAL_STORY_TABS.find(
  ({ value }) => value === 'publish',
)!.label;
const SUPPORTING_TAB = GENERAL_STORY_TABS.find(
  ({ value }) => value === 'supporting',
)!.label;
const TITLE_REASON = '부적절한 제목이에요';
const COVER_URL = 'https://cdn.manyak.app/thumbnails/edit-cover.png';
/** 미리보기가 디코딩할 수 있는 60x60 정상 PNG다. */
const COVER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAJElEQVR4nO3BMQEAAADCoPVP7WkJoAAAAAAAAAAAAAAAAAAAbjh8AAFOgZ4bAAAAAElFTkSuQmCC',
  'base64',
);

const DETAIL = {
  id: STORY_ID,
  title: '노선도에 없는 역',
  oneLineIntro: '막차에서 내린 곳',
  description: '',
  genres: ['판타지'],
  turnCount: 0,
  author: { id: null, nickname: '마냑', profileImageUrl: null },
  createdAt: '2026-09-29T03:00:00Z',
  reachedEndings: [],
  startSettings: [
    {
      id: 'start-1',
      name: '승강장',
      prologue: '불 꺼진 승강장에 내렸다',
      startSituation: '열차가 떠나고 혼자 남았다',
      endings: [],
    },
  ],
};

const EDIT_FORM = {
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
      id: 'start-1',
      name: '승강장',
      prologue: '불 꺼진 승강장에 내렸다',
      startSituation: '열차가 떠나고 혼자 남았다',
      suggestedInputs: ['추천 입력 1', '추천 입력 2', '추천 입력 3'],
      endings: [],
    },
  ],
  mainEvents: [],
  thumbnailUrl: COVER_URL,
  thumbnailModerationStatus: 'APPROVED',
  characters: [
    { id: 'char-1', name: '도하람', description: '보관소 관리인', images: [] },
  ],
  submission: null,
};

type Setup = {
  isOwner?: boolean;
  editForm?: Record<string, unknown>;
  /** 제출본 조회가 돌려줄 상태다. */
  result?: 'APPROVED' | 'REJECTED';
};

/** 상세와 수정 폼, PATCH, 제출본 조회를 목킹하고 받은 PATCH 본문을 모은다. */
async function setup(
  page: Page,
  { isOwner = true, editForm = EDIT_FORM, result = 'APPROVED' }: Setup = {},
) {
  const patches: Record<string, unknown>[] = [];

  await skipOnboarding(page);
  await mockMemberSession(page);
  await page.route(COVER_URL, (route) =>
    route.fulfill({ contentType: 'image/png', body: COVER_PNG }),
  );
  await page.route('**/api/v1/stories/simple/tags', (route) =>
    route.fulfill({ json: [{ id: 1, name: '판타지', category: 'GENRE' }] }),
  );
  await page.route(STORY_DETAIL, async (route: Route) => {
    if (route.request().method() === 'PATCH') {
      patches.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 202,
        json: { submissionId: 'sub-1', status: 'PENDING' },
      });

      return;
    }

    await route.fulfill({ json: { ...DETAIL, isOwner } });
  });
  // 반려된 뒤의 수정 폼은 서버처럼 반려 제출본을 함께 돌려준다.
  await page.route(EDIT_FORM_URL, (route) =>
    route.fulfill({
      json:
        result === 'REJECTED' && patches.length > 0
          ? {
              ...editForm,
              submission: {
                submissionId: 'sub-1',
                status: 'REJECTED',
                issues: [{ path: 'title', reason: TITLE_REASON }],
                imageErrors: [],
                errorCode: null,
              },
            }
          : editForm,
    }),
  );
  await page.route(SUBMISSION_URL, (route) =>
    route.fulfill({
      json: {
        submissionId: 'sub-1',
        storyId: STORY_ID,
        kind: 'UPDATE',
        status: result,
        issues:
          result === 'REJECTED'
            ? [{ path: 'title', reason: TITLE_REASON }]
            : [],
        imageErrors: [],
        errorCode: null,
        createdAt: '2026-10-01T03:00:00Z',
        updatedAt: '2026-10-01T03:00:00Z',
        decidedAt: '2026-10-01T03:00:01Z',
        payload: editForm,
      },
    }),
  );

  return patches;
}

async function openOptionsMenu(page: Page) {
  await page.goto(APP_PATH.STORY_DETAIL(STORY_ID));
  await page.getByRole('button', { name: '스토리 옵션 더보기' }).click();
}

async function openEditFromDetail(page: Page) {
  await openOptionsMenu(page);
  await page.getByRole('menuitem', { name: '수정하기' }).click();
  await expect(page).toHaveURL(new RegExp(`${APP_PATH.STORY_EDIT(STORY_ID)}$`));
}

const titleInput = (page: Page) =>
  page.getByLabel(GENERAL_STORY_TEXT_FIELDS.title.label);

async function save(page: Page) {
  await page.getByRole('tab', { name: PUBLISH_TAB, exact: true }).click();
  await page
    .getByRole('button', { name: GENERAL_STORY_EDIT_COPY.save })
    .click();
}

test.describe('스토리 수정', () => {
  test('회원이 만든 스토리는 메뉴 맨 위 수정하기로 수정 화면을 열고 현재 내용으로 폼을 채운다 (STORY-DETAIL-44, STORY-EDIT-01)', async ({
    page,
  }) => {
    await setup(page);
    await openOptionsMenu(page);

    await expect(page.getByRole('menuitem').first()).toHaveText('수정하기');
    await page.getByRole('menuitem', { name: '수정하기' }).click();

    await expect(
      page.getByRole('heading', { name: GENERAL_STORY_EDIT_COPY.title }),
    ).toBeVisible();
    await expect(titleInput(page)).toHaveValue(EDIT_FORM.title);
    // 수정 화면은 이미지를 바꾸기만 해 삭제 버튼을 두지 않는다.
    await expect(
      page.getByRole('button', { name: GENERAL_STORY_COVER_COPY.change }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: GENERAL_STORY_COVER_COPY.remove,
        exact: true,
      }),
    ).toHaveCount(0);
  });

  test('제작 탭 내 스토리 카드의 옵션 맨 위 수정하기로 수정 화면을 연다 (STORY-LIST-39)', async ({
    page,
  }) => {
    await setup(page);
    await page.route('**/api/v1/users/me/stories**', (route) =>
      route.fulfill({ json: [DETAIL] }),
    );
    await page.goto(APP_PATH.MAIN.STUDIO);
    await page.getByRole('button', { name: '스토리 옵션 더보기' }).click();

    await expect(page.getByRole('menuitem').first()).toHaveText('수정하기');
    await page.getByRole('menuitem', { name: '수정하기' }).click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STORY_EDIT(STORY_ID)}$`),
    );
    await expect(titleInput(page)).toHaveValue(EDIT_FORM.title);
  });

  test('내가 만들지 않은 스토리에는 수정하기가 없다 (STORY-DETAIL-45)', async ({
    page,
  }) => {
    await setup(page, { isOwner: false });
    await openOptionsMenu(page);

    await expect(
      page.getByRole('menuitem', { name: STORY_REPORT_COPY.action }),
    ).toBeVisible();
    await expect(page.getByRole('menuitem', { name: '수정하기' })).toHaveCount(
      0,
    );
  });

  test('제목만 고쳐 저장하면 제목만 보내고 승인되면 상세로 돌아간다 (STORY-EDIT-02)', async ({
    page,
  }) => {
    const patches = await setup(page);

    await openEditFromDetail(page);
    await titleInput(page).fill('막차 뒤의 역');
    await save(page);

    await expect(page.getByText(TOAST_MESSAGE.STORY_EDITED)).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STORY_DETAIL(STORY_ID)}$`),
    );
    expect(patches).toEqual([{ title: '막차 뒤의 역' }]);
  });

  test('주변 인물의 인물 소개를 현재 값으로 채우고, 고쳐 저장하면 인물 목록에 실어 보낸다 (STORY-EDIT-16)', async ({
    page,
  }) => {
    const patches = await setup(page);

    await openEditFromDetail(page);
    await page.getByRole('tab', { name: SUPPORTING_TAB, exact: true }).click();

    const introduction = page.getByLabel(
      GENERAL_STORY_CHARACTER_COPY.introductionLabel,
      { exact: true },
    );

    await expect(introduction).toHaveValue('보관소 관리인');
    await introduction.fill('무뚝뚝한 보관소 관리인');
    await save(page);

    await expect(page.getByText(TOAST_MESSAGE.STORY_EDITED)).toBeVisible();
    expect(patches).toEqual([
      {
        characters: [
          {
            id: 'char-1',
            name: '도하람',
            description: '무뚝뚝한 보관소 관리인',
            images: [],
          },
        ],
      },
    ]);
  });

  test('저장을 마치고 돌아온 뒤 뒤로가기를 눌러도 수정 화면이 다시 나오지 않는다 (STORY-EDIT-14)', async ({
    page,
  }) => {
    await setup(page);
    await page.route('**/api/v1/users/me/stories**', (route) =>
      route.fulfill({ json: [DETAIL] }),
    );
    await page.goto(APP_PATH.MAIN.STUDIO);
    await page.getByRole('link', { name: `${DETAIL.title} 상세 보기` }).click();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STORY_DETAIL(STORY_ID)}$`),
    );
    await page.getByRole('button', { name: '스토리 옵션 더보기' }).click();
    await page.getByRole('menuitem', { name: '수정하기' }).click();
    await titleInput(page).fill('막차 뒤의 역');
    await save(page);
    await expect(page.getByText(TOAST_MESSAGE.STORY_EDITED)).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STORY_DETAIL(STORY_ID)}$`),
    );

    await page.goBack();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
  });

  test('제작 탭 카드에서 들어가 저장하면 제작 탭으로 돌아오고 뒤로가기를 눌러도 수정 화면이 나오지 않는다 (STORY-EDIT-15)', async ({
    page,
  }) => {
    await setup(page);
    await page.route('**/api/v1/users/me/stories**', (route) =>
      route.fulfill({ json: [DETAIL] }),
    );
    await page.goto('/');
    await page
      .getByRole('navigation')
      .getByRole('link', { name: '제작' })
      .click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await page.getByRole('button', { name: '스토리 옵션 더보기' }).click();
    await page.getByRole('menuitem', { name: '수정하기' }).click();
    await titleInput(page).fill('막차 뒤의 역');
    await save(page);
    await expect(page.getByText(TOAST_MESSAGE.STORY_EDITED)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));

    await page.goBack();

    // 하단 탭 이동은 기록을 바꿔 쓰므로 제작 탭 앞은 처음 연 화면이다. 수정 화면만 아니면 된다.
    await expect(page).not.toHaveURL(
      new RegExp(`${APP_PATH.STORY_EDIT(STORY_ID)}$`),
    );
  });

  test('바꾼 것 없이 저장하면 요청하지 않고 상세로 돌아간다 (STORY-EDIT-03)', async ({
    page,
  }) => {
    const patches = await setup(page);

    await openEditFromDetail(page);
    await save(page);

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STORY_DETAIL(STORY_ID)}$`),
    );
    expect(patches).toEqual([]);
  });

  test('반려되면 칸에 사유를 보이고 다시 저장할 때 모든 필드를 보낸다 (STORY-EDIT-05)', async ({
    page,
  }) => {
    const patches = await setup(page, { result: 'REJECTED' });

    await openEditFromDetail(page);
    await titleInput(page).fill('막차 뒤의 역');
    await save(page);

    await expect(
      page.getByText(TOAST_MESSAGE.STORY_REVIEW_REJECTED),
    ).toBeVisible();
    await expect(
      page.getByText(GENERAL_STORY_REVIEW_COPY.editRejectedDescription),
    ).toBeVisible();
    await expect(page.getByText(TITLE_REASON)).toBeVisible();

    await titleInput(page).fill('새 이름의 역');
    await save(page);

    await expect.poll(() => patches.length).toBe(2);
    expect(Object.keys(patches[1])).toEqual(
      expect.arrayContaining([
        'title',
        'storySettings',
        'startSettings',
        'characters',
      ]),
    );
  });

  test('반려된 뒤 나갔다가 다시 들어오면 새로 받은 반려 결과로 폼을 연다 (STORY-EDIT-13)', async ({
    page,
  }) => {
    await setup(page, { result: 'REJECTED' });

    await openEditFromDetail(page);
    await titleInput(page).fill('막차 뒤의 역');
    await save(page);
    await expect(
      page.getByText(GENERAL_STORY_REVIEW_COPY.editRejectedDescription),
    ).toBeVisible();

    await page
      .getByRole('button', { name: GENERAL_STORY_EDIT_COPY.close })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STORY_DETAIL(STORY_ID)}$`),
    );
    await page.getByRole('button', { name: '스토리 옵션 더보기' }).click();
    await page.getByRole('menuitem', { name: '수정하기' }).click();

    await expect(
      page.getByText(GENERAL_STORY_REVIEW_COPY.editRejectedDescription),
    ).toBeVisible();
  });

  test('검토 중인 수정이 있으면 안내를 보이고 저장하기를 잠근다 (STORY-EDIT-06)', async ({
    page,
  }) => {
    await setup(page, {
      editForm: {
        ...EDIT_FORM,
        submission: {
          submissionId: 'sub-1',
          status: 'PENDING',
          issues: [],
          imageErrors: [],
          errorCode: null,
        },
      },
    });

    await page.goto(APP_PATH.STORY_EDIT(STORY_ID));
    await expect(
      page.getByText(GENERAL_STORY_REVIEW_COPY.pendingTitle),
    ).toBeVisible();
    await page.getByRole('tab', { name: PUBLISH_TAB, exact: true }).click();
    await expect(
      page.getByRole('button', { name: GENERAL_STORY_EDIT_COPY.save }),
    ).toBeDisabled();
  });

  test('게스트는 로그인 화면으로 보낸다 (STORY-EDIT-08)', async ({ page }) => {
    await skipOnboarding(page);
    await mockGuestSession(page);
    await page.goto(APP_PATH.STORY_EDIT(STORY_ID));

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.LOGIN}\\?`));
  });
});
