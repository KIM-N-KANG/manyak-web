import { expect, seedStoryIds, skipOnboarding, test } from '../fixtures/test';
import { VISUAL_FIXED_NOW, waitForFonts } from '../fixtures/visual';

/**
 * 스토리 목록(홈)·상세·생성 퍼널의 안정된 정적 상태를 비교하는 비주얼 회귀 스펙.
 * 퍼널 진행·삭제 같은 동작 검증은 `stories/*.spec.ts`가 담당한다.
 */

const STORIES_BATCH = '**/api/v1/stories/batch';
const STORY_DETAIL = '**/api/v1/stories/s1';
const TAGS = '**/api/v1/stories/simple/tags';

/**
 * 스토리 목록 배치 응답의 요약 한 건을 만든다.
 *
 * @param id 스토리 ID
 * @param title 스토리 제목
 * @returns 스토리 요약 목킹 객체
 */
const story = (id: string, title: string) => ({
  id,
  title,
  oneLineIntro: '한 줄 소개입니다',
  genres: ['판타지'],
  createdAt: '2026-06-01T00:00:00Z',
});

/** 시작 설정 2개를 가진 스토리 상세 목킹 응답. 썸네일이 없어 placeholder가 렌더된다. */
const storyDetail = {
  id: 's1',
  title: '용의 계곡',
  oneLineIntro: '잃어버린 용을 찾는 모험',
  description: '깊은 계곡 속 전설의 이야기',
  genres: ['판타지', '모험'],
  turnCount: 1280,
  createdAt: '2026-06-01T00:00:00Z',
  startSettings: [
    {
      id: 'ss1',
      name: '계곡 입구',
      prologue: '안개 낀 계곡 앞에 섰다',
      startSituation: '용의 흔적을 따라왔다',
    },
    {
      id: 'ss2',
      name: '용의 둥지',
      prologue: '거대한 둥지 앞에 도착했다',
      startSituation: '용의 숨소리가 들려온다',
    },
  ],
};

/** 생성 퍼널 1단계(키워드 선택)에 표시할 카테고리별 태그 목킹 응답. */
const tags = [
  { id: 1, name: '판타지', category: 'GENRE' },
  { id: 2, name: '로맨스', category: 'GENRE' },
  { id: 3, name: '용감한', category: 'PROTAGONIST' },
  { id: 4, name: '든든한', category: 'SUPPORTING_CHARACTER' },
];

test.describe('스토리 비주얼', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(VISUAL_FIXED_NOW);
  });

  test('스토리 목록 기본 상태 (STORY-LIST)', async ({ page }) => {
    await seedStoryIds(page, ['s1', 's2']);
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          story('s1', '용의 계곡'),
          story('s2', '별빛 항해'),
        ]),
      });
    });

    await page.goto('/');

    await expect(page.getByText('용의 계곡', { exact: true })).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('story-list-default.png');
  });

  test('스토리 목록 빈 상태 (STORY-LIST)', async ({ page }) => {
    await skipOnboarding(page);

    await page.goto('/');

    await expect(page.getByText('아직 만든 스토리가 없어요')).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('story-list-empty.png');
  });

  test('스토리 상세 기본 상태: placeholder 썸네일·시작 설정 (STORY-DETAIL)', async ({
    page,
  }) => {
    await page.route(STORY_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(storyDetail),
      });
    });

    await page.goto('/stories/s1');

    await expect(
      page.getByRole('heading', { level: 1, name: '용의 계곡' }),
    ).toBeVisible();
    await expect(page.getByText('용의 흔적을 따라왔다')).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('story-detail-default.png');
  });

  test('생성 퍼널 1단계: 키워드 선택 초기 상태 (STORY-KEYWORD)', async ({
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

    await expect(page.getByRole('button', { name: '판타지' })).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('story-create-step1.png');
  });
});
