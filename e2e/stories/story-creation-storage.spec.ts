import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { CREATION_EPOCH_KEY } from '@/features/stories/_shared/utils/creation-db';
import {
  type KeywordDraftRecord,
  PENDING_CREATION_REQUEST_STORAGE_KEY,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { STORY_CREATE_BACK_DIALOG_COPY } from '@/features/stories/new/components/header/story-create-back-dialog';
import { CREATION_PROGRESS_CARD_COPY } from '@/features/studio/menu/constants';

import { mockApi } from '../fixtures/api-mock';
import { readCreationStorage } from '../fixtures/storage';
import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';

const draft: KeywordDraftRecord = {
  stage: 'KEYWORD_DRAFT',
  requestId: '44444444-4444-4444-8444-444444444444',
  createdAt: '2026-09-21T03:00:00.000Z',
  snapshot: {
    selectedGenreTagIds: [1],
    customGenreTags: [],
    protagonist: {
      name: '이관한 주인공',
      gender: null,
      selectedTagIds: [],
      customTags: [],
    },
    supportingCharacters: [],
  },
};

// 실제 IndexedDB와 Dexie의 탭 간 구독을 사용한다. API만 fixture로 대체한다.
test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
  await mockMemberSession(page);
});

test('구 localStorage 초안을 한 번 이관하고 다른 탭의 삭제를 반영한다 (STORY-DRAFT-13, 16)', async ({
  page,
  context,
}) => {
  await page.addInitScript(
    ({ key, record }) => {
      if (!sessionStorage.getItem('legacy-seeded')) {
        localStorage.setItem(key, JSON.stringify(record));
        sessionStorage.setItem('legacy-seeded', '1');
      }
    },
    { key: PENDING_CREATION_REQUEST_STORAGE_KEY, record: draft },
  );
  await page.goto(APP_PATH.MAIN.STUDIO);

  const cards = page.getByRole('article', {
    name: CREATION_PROGRESS_CARD_COPY.draftTitle,
  });

  await expect(cards).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(
        (key) => localStorage.getItem(key),
        PENDING_CREATION_REQUEST_STORAGE_KEY,
      ),
    )
    .toBeNull();

  const migrated = JSON.parse(
    (await readCreationStorage(page, PENDING_CREATION_REQUEST_STORAGE_KEY))!,
  ) as KeywordDraftRecord[];

  expect(migrated[0]).toMatchObject(draft);

  const other = await context.newPage();

  await mockApi(other);
  await mockMemberSession(other);
  await skipOnboarding(other);
  await other.goto(APP_PATH.MAIN.STUDIO);
  await expect(
    other.getByRole('article', {
      name: CREATION_PROGRESS_CARD_COPY.draftTitle,
    }),
  ).toHaveCount(1);
  await other
    .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.optionsTrigger })
    .click();
  await other
    .getByRole('menuitem', { name: CREATION_PROGRESS_CARD_COPY.delete })
    .click();
  await other
    .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.delete })
    .click();
  await expect(cards).toHaveCount(0);
  await page.reload();
  await expect(cards).toHaveCount(0);
  await expect
    .poll(() => readCreationStorage(page, PENDING_CREATION_REQUEST_STORAGE_KEY))
    .toBeNull();
  await other.close();
});

test('DB를 열 수 없으면 입력을 표시하지 않고 실패와 재시도를 제공한다 (STORY-DRAFT-14)', async ({
  page,
}) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    };
  });
  await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
  await expect(
    page.getByText(TOAST_MESSAGE.STORY_DRAFT_LOAD_FAILED),
  ).toBeVisible();
  await expect(page.getByText('키워드를 선택해주세요')).toBeHidden();
  await page.getByRole('button', { name: '다시 시도하기' }).click();
  await expect(
    page.getByText(TOAST_MESSAGE.STORY_DRAFT_LOAD_FAILED),
  ).toBeVisible();
});

test('용량 초과 시 저장 완료로 표시하지 않고 이탈과 생성 제출을 막는다 (STORY-DRAFT-15)', async ({
  page,
}) => {
  await page.route('**/api/v1/stories/simple/tags', (route) =>
    route.fulfill({
      json: [
        { id: 1, name: '판타지', category: 'GENRE' },
        { id: 2, name: '용감한', category: 'PROTAGONIST' },
      ],
    }),
  );
  await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
  await expect(page.getByRole('button', { name: '판타지' })).toBeVisible();
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;

    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'pendingCreations')
        throw new DOMException('Quota exceeded', 'QuotaExceededError');

      return put.apply(this, args);
    };
  });
  await page.getByRole('button', { name: '판타지' }).click();
  await page.getByRole('button', { name: '스토리 만들기 닫기' }).click();
  await page
    .getByRole('button', { name: STORY_CREATE_BACK_DIALOG_COPY.saved.confirm })
    .click();
  await expect(
    page.getByText(TOAST_MESSAGE.STORY_DRAFT_SAVE_FAILED),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`));
  await expect(page.getByRole('button', { name: '판타지' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText('임시 저장됨', { exact: true })).toBeHidden();

  await expect(
    page.getByText(TOAST_MESSAGE.STORY_DRAFT_SAVE_FAILED),
  ).toBeHidden();

  let submissions = 0;

  await page.route('**/api/v1/stories/simple/storylines', (route) => {
    submissions++;

    return route.abort();
  });
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '용감한' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '스토리라인 만들기' }).click();
  await expect(
    page.getByText(TOAST_MESSAGE.STORY_DRAFT_SAVE_FAILED),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '스토리라인 만들기' }),
  ).toBeEnabled();
  expect(submissions).toBe(0);
});

test('다른 탭에서 세션이 종료되면 이전 편집기의 저장을 막는다 (STORY-DRAFT-17)', async ({
  page,
  context,
}) => {
  await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
  await expect(page.getByText('키워드를 선택해주세요')).toBeVisible();

  const other = await context.newPage();

  await mockApi(other);
  await skipOnboarding(other);
  await other.goto(APP_PATH.MAIN.STUDIO);
  await other.evaluate(
    (key) => localStorage.setItem(key, String(Date.now())),
    CREATION_EPOCH_KEY,
  );
  await expect(
    page.getByText(TOAST_MESSAGE.STORY_DRAFT_LOAD_FAILED),
  ).toBeVisible();
  await expect(page.getByText('키워드를 선택해주세요')).toBeHidden();
  await other.close();
});
