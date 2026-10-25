import { type Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { CREDIT_SHORTAGE_COPY } from '@/features/my/_shared/constants/credit-shortage';
import { CREATION_PROGRESS_CARD_COPY } from '@/features/studio/menu/constants';

import { mockStoryDrafts } from '../fixtures/api-mock';
import { completeStory } from '../fixtures/story-generation';
import {
  EXHAUSTED_TRIALS,
  expect,
  mockMemberSession,
  mockTrials,
  test,
} from '../fixtures/test';

/**
 * 스토리 완성의 회원 이프 게이팅 스펙(QA STORY-LIMIT-06, STORY-LIMIT-12).
 * 제작은 회원 전용이라 게스트 체험 한도 분기는 없다. 아는 잔액이 모자라면 퍼널에서 이프 부족 시트로 안내하고,
 * 제작 탭으로 떠난 뒤 확정된 402는 이프 부족 토스트로 안내한다.
 * 게스트 진입 차단은 `stories/story-login-gate.spec.ts`가 검증한다.
 */
const TAGS = '**/api/v1/stories/simple/tags';
const STORYLINES = '**/api/v1/stories/simple/storylines';
const CREATE_STORY = '**/api/v1/stories/simple';

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
  ],
};

/**
 * 스토리라인 생성·선택까지 마쳐 추가 정보 단계에 도달한다.
 *
 * @param page 대상 페이지
 */
const goToAdditionalInfoStep = async (page: Page) => {
  await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
  await page.getByRole('button', { name: '판타지' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '용감한' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '스토리라인 만들기' }).click();
  await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
  await page.getByRole('button', { name: '선택하기' }).click();
  await expect(
    page.getByRole('button', { name: '스토리 완성하기' }),
  ).toBeVisible();
};

test.describe('스토리 완성 이프 게이팅', () => {
  // 회원 세션으로 진행한다.
  test.beforeEach(async ({ page }) => {
    await mockMemberSession(page);
    await page.route(TAGS, async (route) => {
      await route.fulfill({ json: tags });
    });
    await page.route(STORYLINES, async (route) => {
      await route.fulfill({ status: 201, json: storylinesResponse });
    });
  });

  test('회원 완성 요청이 402(이프 부족)면 제작 탭에서 토스트만 띄우고 초안 카드로 되돌아가 입력을 유지한다 (STORY-LIMIT-06)', async ({
    page,
  }) => {
    await page.route(CREATE_STORY, async (route) => {
      await route.fulfill({
        status: 402,
        json: { code: 'INSUFFICIENT_CREDIT' },
      });
    });

    await goToAdditionalInfoStep(page);

    const additionalInfoInput = page.locator(
      'textarea[aria-label="추가 정보 1"]',
    );

    await additionalInfoInput.fill('비밀은 사라진 왕국의 문장이다');
    await completeStory(page);

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(page.getByText(TOAST_MESSAGE.CREDIT_SHORTAGE)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeVisible();

    await page
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.resume })
      .click();
    await expect(additionalInfoInput).toHaveValue(
      '비밀은 사라진 왕국의 문장이다',
    );
  });

  test('체험이 없고 아는 잔액이 완성 비용보다 적으면 요청 없이 시트를 띄우고, 충전은 초안을 저장한 뒤 이프 충전으로 바꿔 떠난다 (STORY-LIMIT-12)', async ({
    page,
  }) => {
    const drafts = await mockStoryDrafts(page);

    await mockTrials(page, EXHAUSTED_TRIALS);
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        json: {
          id: 'user-1',
          nickname: '배고픈 송아지',
          creditBalance: 0,
          attendedToday: true,
        },
      });
    });

    let createRequested = false;

    await page.route(CREATE_STORY, async (route) => {
      createRequested = true;
      await route.fulfill({
        status: 402,
        json: { code: 'INSUFFICIENT_CREDIT' },
      });
    });

    await goToAdditionalInfoStep(page);
    await page
      .locator('textarea[aria-label="추가 정보 1"]')
      .fill('비밀은 사라진 왕국의 문장이다');
    await completeStory(page);

    const sheet = page.getByRole('dialog');

    await expect(
      sheet.getByRole('heading', { name: CREDIT_SHORTAGE_COPY.title }),
    ).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );

    await sheet
      .getByRole('button', { name: CREDIT_SHORTAGE_COPY.charge })
      .click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MY_CREDITS}$`));
    expect(createRequested).toBe(false);
    expect(drafts.puts).toHaveLength(1);
    expect(drafts.puts[0].body.payload).toMatchObject({
      step: 'additional-info',
      additionalInfos: ['비밀은 사라진 왕국의 문장이다'],
    });
  });
});
