import { expect, test } from '../fixtures/test';

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
  selectedTags: [],
  storylines: [
    {
      id: 101,
      story: '첫 번째 이야기 흐름입니다.',
      recommendedInfos: [{ id: 1, text: '주인공은 비밀을 품고 있다' }],
    },
    { id: 102, story: '두 번째 이야기 흐름입니다.', recommendedInfos: [] },
    { id: 103, story: '세 번째 이야기 흐름입니다.', recommendedInfos: [] },
  ],
};

test.describe('스토리 생성', () => {
  test('키워드 → 스토리라인 → 추가정보 → 완성하면 채팅방으로 이동한다 (US-3)', async ({
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
    await page.getByRole('button', { name: '스토리라인 만들기' }).click();

    // Step 2: 스토리라인 선택
    await expect(page.getByText('첫 번째 이야기 흐름입니다.')).toBeVisible();
    await page.getByRole('button', { name: '선택하기' }).click();

    // Step 3: 추가 정보 → 완성
    await expect(
      page.getByRole('button', { name: '스토리 완성하기' }),
    ).toBeVisible();
    await page.getByRole('button', { name: '스토리 완성하기' }).click();

    // Step 4: 완료 후 채팅방 이동
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

    await expect(
      page.getByText('스토리를 완성하지 못했어요. 잠시 후 다시 시도해주세요.'),
    ).toBeVisible();
    await expect(additionalInfoInput).toHaveValue(
      '비밀은 사라진 왕국의 문장이다',
    );
    await expect(recommendation).toHaveAttribute('aria-pressed', 'true');
  });
});
