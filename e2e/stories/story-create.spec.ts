import { expect, skipChatTour, test } from '../fixtures/test';

// 스토리 완성 후 도착하는 채팅 화면에서 안내 투어가 뜨지 않게 한다.
test.beforeEach(async ({ page }) => {
  await skipChatTour(page);
});

// 스토리 생성 4단계 funnel(/stories/new, (story) 레이아웃이라 온보딩 게이팅 없음).
// API 순서: GET /stories/simple/tags → POST /stories/simple/storylines
//           → POST /stories/simple → POST /chats → /chats/{id} 이동
// 각 URL이 명확히 달라 글롭 패턴이 겹치지 않는다(/simple 은 /simple/tags·/simple/storylines 와 별개).
const TAGS = '**/api/v1/stories/simple/tags';
const STORYLINES = '**/api/v1/stories/simple/storylines';
const CREATE_STORY = '**/api/v1/stories/simple';
const CREATE_CHAT = '**/api/v1/chats';

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

test.describe('스토리 생성', () => {
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

    await page.goto('/stories/new');

    // 장르는 제공 키워드만 고를 수 있어 직접 추가는 인물 탭에만 있다.
    await page.getByRole('button', { name: '판타지' }).click();
    await page.getByRole('button', { name: '다음' }).click();
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

    await page.goto('/stories/new');

    const nextButton = page.getByRole('button', { name: '다음' });
    const validationError = page.getByText('키워드를 하나 이상 선택해주세요');
    const footer = page.getByRole('navigation').filter({ has: nextButton });

    await expect(nextButton).toBeEnabled();
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
      page.getByRole('tab', { name: /주인공 특징/ }),
    ).toHaveAttribute('aria-selected', 'true');

    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    await expect(validationError).toBeVisible();
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

    await page.goto('/stories/new');

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

    await page.goto('/stories/new');

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

    await page.goto('/stories/new');

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

    await page.goto('/stories/new');

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
