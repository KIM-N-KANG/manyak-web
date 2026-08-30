import { type Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { GUEST_LIMIT_SHEET_COPY } from '@/features/auth/_shared/constants/guest-limit';

import { mockMemberSession } from '../fixtures/auth';
import { expect, seedGuestUsage, seedStoryIds, test } from '../fixtures/test';

/**
 * 스토리 생성 퍼널의 게스트 한도·크레딧 게이팅 스펙(QA STORY-LIMIT-02~06·09).
 * 로컬 카운터 선차단, 서버 402 사유별 다이얼로그 분기, 카운터 증가 규칙을 검증한다.
 * 한도 수치의 정본은 백엔드 정책이며, 클라이언트 선차단은 `GUEST_LIMITS`
 * (스토리라인 5·스토리 1)를 따른다.
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

/** 402 응답 바디. 사유는 `code`로 구분한다(백엔드 KNK-524). */
const paymentRequired = (code: string) => ({
  status: 402,
  contentType: 'application/json',
  body: JSON.stringify({ code }),
});

/**
 * 태그 조회를 목킹한다. 퍼널 1단계 렌더의 최소 전제다.
 *
 * @param page 대상 페이지
 */
const mockTags = async (page: Page) => {
  await page.route(TAGS, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(tags),
    });
  });
};

/**
 * 키워드 단계에서 필수 태그를 골라 스토리라인 생성 직전까지 진행한다.
 *
 * @param page 대상 페이지
 */
const fillKeywordStep = async (page: Page) => {
  await page.getByRole('button', { name: '판타지' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '용감한' }).click();
  await page.getByRole('button', { name: '다음' }).click();
};

/**
 * 스토리라인 생성·선택까지 마쳐 추가 정보 단계에 도달한다.
 *
 * @param page 대상 페이지
 */
const goToAdditionalInfoStep = async (page: Page) => {
  await fillKeywordStep(page);
  await page.getByRole('button', { name: '스토리라인 만들기' }).click();
  await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
  await page.getByRole('button', { name: '선택하기' }).click();
  await expect(
    page.getByRole('button', { name: '스토리 완성하기' }),
  ).toBeVisible();
};

test.describe('생성 퍼널 진입 백스톱', () => {
  test('스토리 한도(1) 도달 게스트가 /studio/story/simple에 직접 진입하면 백스톱 바텀 시트를 띄우고, 닫으면 재노출 없이 조작 가능하다 (STORY-LIMIT-02)', async ({
    page,
  }) => {
    await mockTags(page);
    await seedGuestUsage(page, { storyCreate: 1 });

    // 제작 목록 CTA를 우회한 딥링크 진입을 재현한다.
    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByRole('heading', { name: GUEST_LIMIT_SHEET_COPY.title }),
    ).toBeVisible();

    // 닫기 버튼이 없는 바텀 시트라 바깥(백드롭) 터치로 닫는다.
    await page.mouse.click(10, 10);

    await expect(dialog).toBeHidden();

    // 닫은 뒤에는 재노출 없이 퍼널을 조작할 수 있다(최종 차단은 서버 402 — STORY-LIMIT-05).
    await page.getByRole('button', { name: '판타지' }).click();
    await expect(page.getByRole('button', { name: '판타지' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(dialog).toBeHidden();
  });
});

test.describe('스토리라인 생성 한도', () => {
  test('스토리라인 카운터가 한도(5)에 도달하면 요청 없이 로그인 바텀 시트를 띄우고 키워드 단계에 머문다 (STORY-LIMIT-03)', async ({
    page,
  }) => {
    let storylineRequestCount = 0;

    await mockTags(page);
    await seedGuestUsage(page, { storylineCreate: 5 });
    await page.route(STORYLINES, async (route) => {
      storylineRequestCount += 1;
      await route.abort();
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await fillKeywordStep(page);
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByRole('heading', { name: GUEST_LIMIT_SHEET_COPY.title }),
    ).toBeVisible();
    expect(storylineRequestCount).toBe(0);

    // 바텀 시트가 배경을 aria-hidden 처리하므로, 바깥 터치로 닫은 뒤에 단계 유지를 확인한다.
    await page.mouse.click(10, 10);
    await expect(dialog).toBeHidden();

    // 선차단은 요청 자체를 막으므로 스토리라인 선택 단계로 넘어가지 않는다.
    await expect(
      page.getByRole('button', { name: '스토리라인 만들기' }),
    ).toBeVisible();
    // 선차단 경로는 생성 요청이 없어 에러 상태가 아니므로 인라인 한도 문구도 뜨지 않는다.
    // 인라인 문구는 서버 402 경로에만 나타난다(STORY-LIMIT-04).
    await expect(
      page.getByText('게스트 스토리라인 생성 횟수를 모두 사용했어요'),
    ).toBeHidden();
  });

  test('서버 402(체험 한도)면 로그인 바텀 시트와 인라인 한도 문구를 함께 표시한다 (STORY-LIMIT-04)', async ({
    page,
  }) => {
    // 로컬 카운터는 미달(0)이어도 서버 판정이 최종이다.
    await mockTags(page);
    await page.route(STORYLINES, async (route) => {
      await route.fulfill(paymentRequired('GUEST_TRIAL_LIMIT_EXCEEDED'));
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await fillKeywordStep(page);
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();

    await expect(
      page
        .getByRole('dialog')
        .getByRole('heading', { name: GUEST_LIMIT_SHEET_COPY.title }),
    ).toBeVisible();
    await expect(
      page.getByText('게스트 스토리라인 생성 횟수를 모두 사용했어요'),
    ).toBeVisible();
  });

  test('스토리라인 카운터는 201 성공 시에만 증가해 다음 재생성을 선차단한다 (STORY-LIMIT-09)', async ({
    page,
  }) => {
    let storylineRequestCount = 0;

    await mockTags(page);
    await seedGuestUsage(page, { storylineCreate: 4 });
    await page.route(STORYLINES, async (route) => {
      storylineRequestCount += 1;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(storylinesResponse),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await fillKeywordStep(page);
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();

    // 4 → 5로 증가해 한도에 도달한다.
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    expect(storylineRequestCount).toBe(1);

    await page.getByRole('button', { name: '다시 만들기' }).click();

    await expect(
      page
        .getByRole('dialog')
        .getByRole('heading', { name: GUEST_LIMIT_SHEET_COPY.title }),
    ).toBeVisible();
    expect(storylineRequestCount).toBe(1);
  });
});

test.describe('스토리 완성 한도·크레딧', () => {
  test('게스트 완성 요청이 402(체험 한도)면 추가 정보 단계로 복귀하고 입력을 유지한다 (STORY-LIMIT-05)', async ({
    page,
  }) => {
    await mockTags(page);
    await page.route(STORYLINES, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(storylinesResponse),
      });
    });
    await page.route(CREATE_STORY, async (route) => {
      await route.fulfill(paymentRequired('GUEST_TRIAL_LIMIT_EXCEEDED'));
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await goToAdditionalInfoStep(page);

    const recommendation = page.getByRole('button', {
      name: '주인공은 비밀을 품고 있다',
    });
    const additionalInfoInput = page.locator(
      'textarea[aria-label="추가 정보 1"]',
    );

    await recommendation.click();
    await additionalInfoInput.fill('비밀은 사라진 왕국의 문장이다');
    await page.getByRole('button', { name: '스토리 완성하기' }).click();

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByRole('heading', { name: GUEST_LIMIT_SHEET_COPY.title }),
    ).toBeVisible();

    // 바텀 시트가 배경을 aria-hidden 처리하므로, 바깥 터치로 닫은 뒤에
    // 인라인 문구와 입력 유지를 확인한다.
    await page.mouse.click(10, 10);
    await expect(dialog).toBeHidden();

    await expect(
      page.getByText('게스트 체험 횟수를 모두 사용했어요', { exact: true }),
    ).toBeVisible();
    await expect(additionalInfoInput).toHaveValue(
      '비밀은 사라진 왕국의 문장이다',
    );
    await expect(recommendation).toHaveAttribute('aria-pressed', 'true');
  });

  test('회원 완성 요청이 402(크레딧 부족)면 현재 화면에서 토스트만 띄우고 입력을 유지한다 (STORY-LIMIT-06)', async ({
    page,
  }) => {
    await mockTags(page);
    await mockMemberSession(page);
    await page.route(STORYLINES, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(storylinesResponse),
      });
    });
    await page.route(CREATE_STORY, async (route) => {
      await route.fulfill(paymentRequired('INSUFFICIENT_CREDIT'));
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await goToAdditionalInfoStep(page);

    const additionalInfoInput = page.locator(
      'textarea[aria-label="추가 정보 1"]',
    );

    await additionalInfoInput.fill('비밀은 사라진 왕국의 문장이다');
    await page.getByRole('button', { name: '스토리 완성하기' }).click();

    await expect(page.getByText(TOAST_MESSAGE.CREDIT_SHORTAGE)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(additionalInfoInput).toHaveValue(
      '비밀은 사라진 왕국의 문장이다',
    );
  });
});

test.describe('게스트 카운터 시드', () => {
  test('저장된 스토리 ID가 있으면 카운터 없이도 스토리 생성 한도로 판정한다 (STORY-LIMIT-09)', async ({
    page,
  }) => {
    // guest-usage 카운터를 심지 않아도 저장된 스토리 ID 수가 storyCreate 시드로 작동한다.
    await mockTags(page);
    await seedStoryIds(page, ['s1']);

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await expect(
      page
        .getByRole('dialog')
        .getByRole('heading', { name: GUEST_LIMIT_SHEET_COPY.title }),
    ).toBeVisible();
  });
});
