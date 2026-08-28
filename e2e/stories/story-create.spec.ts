import { type Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { GUEST_USAGE_STORAGE_KEY } from '@/features/auth/_shared/utils/guest-usage-storage';
import { PENDING_CREATION_REQUEST_STORAGE_KEY } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  CHARACTER_NAME_RESERVED_CHARACTER_ERROR,
  PROTAGONIST_CATEGORY,
  SUPPORTING_CHARACTER_CATEGORY,
} from '@/features/stories/new/constants';

import { expect, skipChatTour, test } from '../fixtures/test';

// 스토리 완성 후 도착하는 채팅 화면에서 안내 투어가 뜨지 않게 한다.
test.beforeEach(async ({ page }) => {
  await skipChatTour(page);
});

// 스토리 생성 4단계 funnel(/studio/story/simple, (story) 레이아웃이라 온보딩 게이팅 없음).
// API 순서: GET /stories/simple/tags → POST /stories/simple/storylines
//           → POST /stories/simple → POST /chats → /chats/{id} 이동
// 각 URL이 명확히 달라 글롭 패턴이 겹치지 않는다(/simple 은 /simple/tags·/simple/storylines 와 별개).
const TAGS = '**/api/v1/stories/simple/tags';
const STORYLINES = '**/api/v1/stories/simple/storylines';
const CREATE_STORY = '**/api/v1/stories/simple';
const CREATION_REQUEST = '**/api/v1/stories/simple/creation-requests/*';
const CREATE_CHAT = '**/api/v1/chats';
const LEGACY_STORY_CREATE_PATH = '/stories/new';

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
    { id: 103, storyline: '세 번째 이야기 흐름입니다.', recommendedInfos: [] },
  ],
};

async function reachAdditionalInfo(page: Page): Promise<void> {
  await page.route(TAGS, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(tags),
    });
  });
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
  await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
  await expect(page.getByRole('tabpanel')).toHaveCSS('padding-bottom', '32px');
  await page.getByRole('button', { name: '선택하기' }).click();
  await expect(
    page.getByRole('button', { name: '스토리 완성하기' }),
  ).toBeVisible();

  const recommendedInfoSection = page.locator(
    'section[aria-labelledby="recommended-info-label"]',
  );
  const additionalInfoSection = page.locator(
    'section[aria-labelledby="additional-info-label"]',
  );

  await expect(recommendedInfoSection).toHaveCSS('margin-bottom', '8px');
  await expect(additionalInfoSection).toHaveCSS('padding-bottom', '32px');
}

test.describe('스토리 생성', () => {
  test('기존 생성 URL은 새 제작 URL로 이동한다 (KNK-988)', async ({ page }) => {
    await page.goto(LEGACY_STORY_CREATE_PATH);

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
  });

  test('직접 키워드가 비어 있으면 인풋 아래 오류를 표시하고 입력하면 해제한다', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await page.getByRole('button', { name: '키워드 추가' }).click();

    const dialog = page.getByRole('dialog');
    const input = dialog.getByRole('textbox', { name: '키워드' });
    const addButton = dialog.getByRole('button', { name: '추가하기' });
    const validationError = dialog.getByText('키워드를 입력해주세요', {
      exact: true,
    });

    await expect(addButton).toBeEnabled();
    await addButton.click();
    await expect(validationError).toBeVisible();
    await input.fill('타임루프');
    await expect(validationError).toBeHidden();
    await addButton.click();
    await expect(page.getByRole('button', { name: '타임루프' })).toBeVisible();
  });

  test('필수 키워드 없이 다음을 누르면 오류를 표시하고 선택하면 해제한다', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    const nextButton = page.getByRole('button', { name: '다음' });
    const validationError = page.getByText('키워드를 하나 이상 선택해주세요');
    const footer = page.getByRole('navigation').filter({ has: nextButton });
    const activePanel = page.getByRole('tabpanel');

    await expect(nextButton).toBeEnabled();
    await expect(activePanel).toHaveCSS('padding-bottom', '32px');
    await nextButton.click();
    await expect(
      footer.getByText('키워드를 하나 이상 선택해주세요'),
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: /장르/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await page.getByRole('button', { name: '판타지' }).click();
    await expect(validationError).toBeHidden();
    await nextButton.click();
    await expect(
      page.getByRole('tab', { name: PROTAGONIST_CATEGORY.label }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(activePanel).toHaveCSS('padding-top', '16px');
    await expect(activePanel).toHaveCSS('padding-bottom', '32px');

    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    await expect(validationError).toBeVisible();

    await page.getByRole('button', { name: '용감한' }).click();
    await expect(validationError).toBeHidden();
    await nextButton.click();
    await expect(
      page.getByRole('tab', { name: SUPPORTING_CHARACTER_CATEGORY.label }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(activePanel).toHaveCSS('padding-bottom', '32px');
  });

  test('주인공과 주변 인물의 이름이 겹치면 생성 요청을 막는다 (스펙 §4-3-2)', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });

    let storylineRequestCount = 0;

    await page.route(STORYLINES, async (route) => {
      storylineRequestCount += 1;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(storylinesResponse),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('textbox', { name: '주인공 이름' }).fill('마냑');
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();

    // 공백·대소문자를 지운 정규화 키로 판정하므로 "마 냑"도 같은 이름이다.
    const supportingName = page.getByRole('textbox', {
      name: '주변 인물 1 이름',
    });

    await supportingName.fill('마 냑');
    await expect(page.getByText('이미 사용한 이름이에요')).toBeVisible();

    const createStorylineButton = page.getByRole('button', {
      name: '스토리라인 만들기',
    });

    await createStorylineButton.click();
    await expect(
      page.getByText('인물 이름이 겹치지 않게 해주세요'),
    ).toBeVisible();
    expect(storylineRequestCount).toBe(0);

    // 이름을 고치면 오류가 사라지고 요청이 나간다.
    await supportingName.fill('도라지');
    await expect(page.getByText('이미 사용한 이름이에요')).toBeHidden();
    await expect(
      page.getByText('인물 이름이 겹치지 않게 해주세요'),
    ).toBeHidden();

    await createStorylineButton.click();
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    expect(storylineRequestCount).toBe(1);
  });

  test('인물 이름에 저장 마커 예약 문자가 있으면 생성 요청을 막는다', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });

    let storylineRequestCount = 0;

    await page.route(STORYLINES, async (route) => {
      storylineRequestCount += 1;
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

    const supportingName = page.getByRole('textbox', {
      name: '주변 인물 1 이름',
    });
    const createStorylineButton = page.getByRole('button', {
      name: '스토리라인 만들기',
    });
    const footer = page
      .getByRole('navigation')
      .filter({ has: createStorylineButton });

    await supportingName.fill('세]린');
    await expect(supportingName).toHaveAttribute('aria-invalid', 'true');
    await expect(
      page.getByText(CHARACTER_NAME_RESERVED_CHARACTER_ERROR).first(),
    ).toBeVisible();

    await createStorylineButton.click();
    await expect(
      footer.getByText(CHARACTER_NAME_RESERVED_CHARACTER_ERROR),
    ).toBeVisible();
    expect(storylineRequestCount).toBe(0);

    await supportingName.fill('세린');
    await expect(supportingName).not.toHaveAttribute('aria-invalid', 'true');
    await expect(
      footer.getByText(CHARACTER_NAME_RESERVED_CHARACTER_ERROR),
    ).toBeHidden();

    await createStorylineButton.click();
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    expect(storylineRequestCount).toBe(1);
  });

  test('키워드 → 스토리라인 → 추가정보 → 완성하면 채팅 화면으로 이동한다 (US-3)', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });
    await page.route(STORYLINES, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(storylinesResponse),
      });
    });
    await page.route(CREATE_STORY, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'story-new',
          title: '새 스토리',
          genres: ['판타지'],
        }),
      });
    });
    await page.route(CREATE_CHAT, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'chat-new', storyId: 'story-new' }),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    // Step 1: 키워드 선택 (장르 → 주인공 → 주변 인물)
    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();

    const createStorylineButton = page.getByRole('button', {
      name: '스토리라인 만들기',
    });

    await expect(createStorylineButton).toHaveAttribute('aria-busy', 'false');
    await createStorylineButton.click();

    // Step 2: 스토리라인 선택
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    await page.getByRole('button', { name: '선택하기' }).click();

    // Step 3: 추가 정보 → 완성
    await expect(
      page.getByRole('button', { name: '스토리 완성하기' }),
    ).toBeVisible();
    await page.getByRole('button', { name: '스토리 완성하기' }).click();

    // Step 4: 완료 후 채팅 화면 이동
    await expect(page).toHaveURL(/\/chats\/chat-new$/);
  });

  test('스토리 완성 실패 후 추가 정보 입력값과 추천 선택을 유지한다', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });
    await page.route(STORYLINES, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(storylinesResponse),
      });
    });
    await page.route(CREATE_STORY, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'failed to create story' }),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();

    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    await page.getByRole('button', { name: '선택하기' }).click();

    const recommendation = page.getByRole('button', {
      name: '주인공은 비밀을 품고 있다',
    });
    const additionalInfoInput = page.locator(
      'textarea[aria-label="추가 정보 1"]',
    );

    await recommendation.click();
    await additionalInfoInput.fill('비밀은 사라진 왕국의 문장이다');
    await page.getByRole('button', { name: '스토리 완성하기' }).click();

    await expect(page.getByText('스토리를 완성하지 못했어요')).toBeVisible();
    await expect(additionalInfoInput).toHaveValue(
      '비밀은 사라진 왕국의 문장이다',
    );
    await expect(recommendation).toHaveAttribute('aria-pressed', 'true');
  });

  test('추가 정보가 있으면 재선택을 경고하고 확정할 때만 입력을 초기화한다', async ({
    page,
  }) => {
    await reachAdditionalInfo(page);

    const recommendation = page.getByRole('button', {
      name: '주인공은 비밀을 품고 있다',
    });
    const additionalInfoInput = page.locator(
      'textarea[aria-label="추가 정보 1"]',
    );
    const reselectButton = page
      .getByRole('navigation')
      .getByRole('button', { name: '다시 선택하기' });

    await recommendation.click();
    await additionalInfoInput.fill('사라진 왕국의 비밀');
    await reselectButton.click();

    const warning = page.getByRole('alertdialog', {
      name: '스토리라인을 바꿀까요?',
    });

    await expect(
      warning.getByText('입력한 추가 정보는 모두 사라져요'),
    ).toBeVisible();
    await warning.getByRole('button', { name: '닫기' }).click();
    await expect(additionalInfoInput).toHaveValue('사라진 왕국의 비밀');
    await expect(recommendation).toHaveAttribute('aria-pressed', 'true');

    await reselectButton.click();
    await warning.getByRole('button', { name: '다시 선택하기' }).click();
    await expect(
      page.getByRole('button', { name: '선택하기', exact: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: '선택하기', exact: true }).click();
    await expect(
      page.locator('textarea[aria-label="추가 정보 1"]'),
    ).toHaveValue('');
    await expect(
      page.getByRole('button', { name: '주인공은 비밀을 품고 있다' }),
    ).toHaveAttribute('aria-pressed', 'false');

    // 초기 빈 입력 칸만 있으면 경고 없이 즉시 스토리라인 선택으로 돌아간다.
    await reselectButton.click();
    await expect(
      page.getByRole('button', { name: '선택하기', exact: true }),
    ).toBeVisible();
    await expect(warning).toBeHidden();
  });

  test('추가 정보 첫 렌더에서 선택한 스토리라인 박스 높이가 변하지 않는다', async ({
    page,
  }) => {
    await reachAdditionalInfo(page);

    const selectedStorylineBox = page.getByTestId('selected-storyline-content');
    const initialHeight = await selectedStorylineBox.evaluate(
      (element) => element.getBoundingClientRect().height,
    );

    await page.waitForTimeout(350);

    const settledHeight = await selectedStorylineBox.evaluate(
      (element) => element.getBoundingClientRect().height,
    );

    expect(settledHeight).toBe(initialHeight);
    await expect(page.getByRole('button', { name: '더보기' })).toBeVisible();
  });

  test('추가 정보 입력의 Tab은 삭제 버튼을 건너뛰고 다음 입력으로 이동한다 (KNK-999)', async ({
    page,
  }) => {
    await reachAdditionalInfo(page);
    await page.getByRole('button', { name: '정보 추가' }).click();

    const firstInput = page.getByRole('textbox', { name: '추가 정보 1' });
    const secondInput = page.getByRole('textbox', { name: '추가 정보 2' });
    const firstRemoveButton = page.getByRole('button', {
      name: '추가 정보 1 삭제',
    });

    await expect(firstRemoveButton).toHaveAttribute('tabindex', '-1');
    await firstInput.focus();
    await firstInput.press('Tab');
    await expect(secondInput).toBeFocused();
  });

  test('채팅 생성 실패 재시도는 스토리를 중복 완성하지 않고 채팅만 다시 만든다', async ({
    page,
  }) => {
    let storyRequestCount = 0;
    let chatRequestCount = 0;

    await page.route(CREATE_STORY, async (route) => {
      storyRequestCount += 1;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'story-chat-retry',
          title: '채팅 재시도 스토리',
          genres: ['판타지'],
        }),
      });
    });
    await page.route(CREATE_CHAT, async (route) => {
      chatRequestCount += 1;

      if (chatRequestCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'failed to create chat' }),
        });

        return;
      }

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'chat-retried',
          storyId: 'story-chat-retry',
        }),
      });
    });
    await reachAdditionalInfo(page);

    await page.getByRole('button', { name: '스토리 완성하기' }).click();
    await expect(page.getByText('스토리를 완성하지 못했어요')).toBeVisible();
    await page.getByRole('button', { name: '스토리 완성하기' }).click();

    await expect(page).toHaveURL(/\/chats\/chat-retried$/);
    expect(storyRequestCount).toBe(1);
    expect(chatRequestCount).toBe(2);
  });

  test('채팅 생성 실패 후 새로고침 복구도 스토리 성공을 중복 적용하지 않는다', async ({
    page,
  }) => {
    let storyRequestCount = 0;
    let chatRequestCount = 0;

    await page.route(CREATE_STORY, async (route) => {
      storyRequestCount += 1;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'story-chat-refresh',
          title: '새로고침 채팅 재시도 스토리',
          genres: ['판타지'],
        }),
      });
    });
    await page.route(CREATION_REQUEST, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stage: 'STORY_COMPLETION',
          status: 'COMPLETED',
          result: {
            id: 'story-chat-refresh',
            title: '새로고침 채팅 재시도 스토리',
            genres: ['판타지'],
          },
        }),
      });
    });
    await page.route(CREATE_CHAT, async (route) => {
      chatRequestCount += 1;
      await route.fulfill({
        status: chatRequestCount === 1 ? 500 : 201,
        contentType: 'application/json',
        body: JSON.stringify(
          chatRequestCount === 1
            ? { message: 'failed to create chat' }
            : {
                id: 'chat-refresh-retried',
                storyId: 'story-chat-refresh',
              },
        ),
      });
    });
    await reachAdditionalInfo(page);

    await page.getByRole('button', { name: '스토리 완성하기' }).click();
    await expect(page.getByText('스토리를 완성하지 못했어요')).toBeVisible();

    const usageAfterStorySuccess = await page.evaluate(
      (key) => localStorage.getItem(key),
      GUEST_USAGE_STORAGE_KEY,
    );

    await expect
      .poll(() =>
        page.evaluate(
          (key) => localStorage.getItem(key),
          PENDING_CREATION_REQUEST_STORAGE_KEY,
        ),
      )
      .toContain('"createdStoryId":"story-chat-refresh"');

    await page.reload();

    await expect(page).toHaveURL(/\/chats\/chat-refresh-retried$/, {
      timeout: 10000,
    });
    expect(storyRequestCount).toBe(1);
    expect(chatRequestCount).toBe(2);
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        GUEST_USAGE_STORAGE_KEY,
      ),
    ).toBe(usageAfterStorySuccess);
  });

  test('같은 완성 요청의 409는 실패로 끝내지 않고 저장한 requestId로 복구한다', async ({
    page,
  }) => {
    const completionRequestIds: string[] = [];

    await page.route(CREATE_STORY, async (route) => {
      const body = route.request().postDataJSON() as { requestId: string };

      completionRequestIds.push(body.requestId);
      await route.fulfill({
        status: completionRequestIds.length === 1 ? 500 : 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'completion is pending' }),
      });
    });
    await page.route(CREATION_REQUEST, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stage: 'STORY_COMPLETION',
          status: 'COMPLETED',
          result: {
            id: 'story-conflict-recovered',
            title: '409 복구 스토리',
            genres: ['판타지'],
          },
        }),
      });
    });
    await page.route(CREATE_CHAT, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'chat-conflict-recovered',
          storyId: 'story-conflict-recovered',
        }),
      });
    });
    await reachAdditionalInfo(page);

    await page.getByRole('button', { name: '스토리 완성하기' }).click();
    await expect(page.getByText('스토리를 완성하지 못했어요')).toBeVisible();
    await page.getByRole('button', { name: '스토리 완성하기' }).click();

    await expect(page).toHaveURL(/\/chats\/chat-conflict-recovered$/, {
      timeout: 10000,
    });
    expect(completionRequestIds).toHaveLength(2);
    expect(completionRequestIds[1]).toBe(completionRequestIds[0]);
  });

  test('스토리라인 생성 실패 시 첫 생성과 재생성을 구분해 안내한다', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });

    // 1·3번째 요청은 실패, 2번째 요청만 성공시켜 첫 생성 실패 → 재생성 성공 → 재생성 실패를 재현한다.
    let storylineRequestCount = 0;

    await page.route(STORYLINES, async (route) => {
      storylineRequestCount += 1;

      if (storylineRequestCount === 2) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(storylinesResponse),
        });

        return;
      }

      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'failed to generate storylines' }),
      });
    });

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '용감한' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();

    // 첫 생성 실패: 재생성 문구가 아닌 첫 생성 실패 문구를 보여준다.
    await expect(page.getByText('스토리라인을 만들지 못했어요')).toBeVisible();
    await expect(
      page.getByText('스토리라인을 다시 만들지 못했어요'),
    ).toBeHidden();

    // 재생성 성공: 스토리라인이 표시된다.
    await page.getByRole('button', { name: '다시 만들기' }).click();
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();

    // 재생성 실패: 이전 결과가 남아 있으므로 재생성 실패 문구를 보여준다.
    await page.getByRole('button', { name: '다시 만들기' }).click();
    await expect(
      page.getByText('스토리라인을 다시 만들지 못했어요'),
    ).toBeVisible();
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
  });

  // 재생성은 전용 API가 없어 서버가 원본과의 관계를 알 수 없다. 프론트가 직전 시도의
  // requestId를 parentCreationId로 실어 Langfuse 여정을 잇는다(스펙 §3-8, 체인 방식).
  test('스토리라인 재생성이 직전 생성의 requestId를 부모로 실어 보낸다', async ({
    page,
  }) => {
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });

    const bodies: { requestId: string; parentCreationId: string | null }[] = [];

    await page.route(STORYLINES, async (route) => {
      bodies.push(route.request().postDataJSON());

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
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();

    const regenerateButton = page.getByRole('button', { name: '다시 만들기' });

    await regenerateButton.click();
    await expect.poll(() => bodies.length).toBe(2);
    await regenerateButton.click();
    await expect.poll(() => bodies.length).toBe(3);

    const [first, second, third] = bodies;

    // 최초 생성은 부모가 없다.
    expect(first.parentCreationId).toBeNull();

    // 재생성마다 새 requestId를 받고, 부모는 바로 직전 시도를 가리킨다.
    expect(second.requestId).not.toBe(first.requestId);
    expect(second.parentCreationId).toBe(first.requestId);

    // 체인이라 세 번째의 부모는 두 번째다 — 최초 루트를 계속 가리키지 않는다.
    expect(third.parentCreationId).toBe(second.requestId);
    expect(third.parentCreationId).not.toBe(first.requestId);
  });
});
