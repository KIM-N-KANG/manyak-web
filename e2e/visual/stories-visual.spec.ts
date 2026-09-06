import { APP_PATH } from '@/constants/app-path';
import { LOGIN_REQUIRED_SHEET_COPY } from '@/features/auth/_shared/constants/login-required';
import { STORY_LIKE_COPY } from '@/features/stories/_shared/constants/story-like';
import { STORY_REPORT_COPY } from '@/features/stories/_shared/constants/story-report';
import { SELECTED_TAGS_TRIGGER_LABEL } from '@/features/stories/new/constants';

import { mockMemberSession } from '../fixtures/auth';
import { expect, seedStoryIds, skipOnboarding, test } from '../fixtures/test';
import {
  VISUAL_FIXED_NOW,
  waitForDarkTheme,
  waitForFonts,
} from '../fixtures/visual';

/**
 * 홈 오리지널·제작 목록·상세·생성 퍼널의 안정된 정적 상태를 비교하는 비주얼 회귀 스펙.
 * 퍼널 진행·삭제 같은 동작 검증은 `stories/*.spec.ts`가 담당한다.
 */

const STORIES_BATCH = '**/api/v1/stories/batch';
const STORIES_ORIGINALS = '**/api/v1/stories/originals';
const STORY_DETAIL = '**/api/v1/stories/s1';
const TAGS = '**/api/v1/stories/simple/tags';
const STORYLINES = '**/api/v1/stories/simple/storylines';

/**
 * 1x1 반투명 빨강 PNG(RGBA 255,0,0,127). 썸네일 요청이 외부 네트워크로 나가지 않도록 목킹한다.
 * 투명 대신 유색을 쓰는 이유는 뷰어의 이미지 영역이 스냅샷에 뚜렷이 드러나야
 * 컨테이너 크기·위치 회귀를 잡을 수 있기 때문이다.
 */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

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
  reachedEndings: ['용과 맺은 약속'],
  startSettings: [
    {
      id: 'ss1',
      name: '계곡 입구',
      prologue: '안개 낀 계곡 앞에 섰다',
      startSituation: '용의 흔적을 따라왔다',
      endings: [{ name: '잃어버린 용과의 재회' }],
    },
    {
      id: 'ss2',
      name: '용의 둥지',
      prologue: '거대한 둥지 앞에 도착했다',
      startSituation: '용의 숨소리가 들려온다',
      endings: [{ name: '새로운 수호자' }],
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

test.describe('스토리 좋아요 비주얼', () => {
  test('좋아요 로그인 바텀 시트', async ({ page }) => {
    await page.clock.setFixedTime(VISUAL_FIXED_NOW);
    await page.route(STORY_DETAIL, (route) =>
      route.fulfill({ json: storyDetail }),
    );
    await page.goto(APP_PATH.STORY_DETAIL('s1'));
    await page
      .getByRole('button', { name: STORY_LIKE_COPY.like, exact: true })
      .click();
    await expect(
      page.getByRole('dialog', { name: LOGIN_REQUIRED_SHEET_COPY.title }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('story-like-login-sheet.png');
  });

  for (const dark of [false, true]) {
    test(`좋아요 선택 상태 (${dark ? '다크' : '라이트'})`, async ({ page }) => {
      await page.clock.setFixedTime(VISUAL_FIXED_NOW);
      await mockMemberSession(page);

      if (dark) {
        await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
      }

      await page.route(STORY_DETAIL, (route) =>
        route.fulfill({
          json: {
            ...storyDetail,
            isLiked: true,
            isOwner: false,
            likeCount: 1234,
          },
        }),
      );
      await page.goto(APP_PATH.STORY_DETAIL('s1'));
      await expect(
        page.getByRole('button', { name: STORY_LIKE_COPY.unlike }),
      ).toBeVisible();

      if (dark) await waitForDarkTheme(page);

      await waitForFonts(page);
      await expect(page).toHaveScreenshot(
        `story-detail-liked${dark ? '-dark' : ''}.png`,
      );
    });
  }
});

test.describe('스토리 상세 CTA 배경 비주얼', () => {
  for (const dark of [false, true]) {
    test(`최하단 메타 정보와 CTA 배경 연결 (${dark ? '다크' : '라이트'})`, async ({
      page,
    }) => {
      await page.clock.setFixedTime(VISUAL_FIXED_NOW);
      await mockMemberSession(page);

      if (dark)
        await page.addInitScript(() => localStorage.setItem('theme', 'dark'));

      await page.route(STORY_DETAIL, (route) =>
        route.fulfill({
          json: {
            ...storyDetail,
            author: { nickname: '마냑' },
            isLiked: true,
            isOwner: false,
          },
        }),
      );
      await page.goto(APP_PATH.STORY_DETAIL('s1'));
      await expect(
        page.getByRole('heading', { name: storyDetail.title, level: 1 }),
      ).toBeVisible();

      if (dark) await waitForDarkTheme(page);

      await waitForFonts(page);
      await page.getByRole('main').evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });

      const metadata = page
        .getByText('제작자', { exact: true })
        .locator('../..');
      const metadataColor = await metadata.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      );

      await expect(page.getByRole('navigation')).toHaveCSS(
        'background-color',
        metadataColor,
      );
      await expect(page).toHaveScreenshot(
        `story-detail-footer${dark ? '-dark' : ''}.png`,
      );
    });
  }
});

test.describe('스토리 비주얼', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(VISUAL_FIXED_NOW);
  });

  test('제작 목록 기본 상태 (STORY-LIST)', async ({ page }) => {
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

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText('용의 계곡', { exact: true })).toBeVisible();

    const optionButtons = page.getByRole('button', {
      name: '스토리 옵션 더보기',
    });

    await expect(optionButtons).toHaveCount(2);
    await expect(optionButtons.first()).toBeVisible();
    await expect(optionButtons.first()).toHaveCSS('width', '24px');
    await expect(optionButtons.first()).toHaveCSS('height', '24px');
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('story-list-default.png');
  });

  test('홈 오리지널 목록 (STORY-LIST)', async ({ page }) => {
    await seedStoryIds(page, ['s1']);
    await page.route(STORIES_ORIGINALS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            ...story('o1', '마냑의 첫 이야기'),
            author: { id: 1, nickname: '마냑', profileImageUrl: null },
          },
        ]),
      });
    });
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([story('s1', '용의 계곡')]),
      });
    });

    await page.goto('/');

    await expect(
      page.getByText('마냑의 첫 이야기', { exact: true }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('story-list-originals.png');
  });

  test('제작 목록 빈 상태 (STORY-LIST)', async ({ page }) => {
    await skipOnboarding(page);

    await page.goto(APP_PATH.MAIN.STUDIO);

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
    await expect(
      page.getByRole('button', { name: '스토리 옵션 더보기' }),
    ).toHaveCount(0);
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

    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);

    await expect(page.getByRole('button', { name: '판타지' })).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('story-create-step1.png');
  });
});

/** 스토리라인 생성 응답. 선택 태그 드로어는 요청에 담긴 선택 태그로 구성된다. */
const storylinesResponse = {
  simpleCreationId: 1001,
  selectedTags: { genreTags: [], supportingCharacters: [] },
  storylines: [
    { id: 101, storyline: '첫 번째 이야기 흐름입니다.', recommendedInfos: [] },
    { id: 102, storyline: '두 번째 이야기 흐름입니다.', recommendedInfos: [] },
  ],
};

/**
 * 오버레이(다이얼로그·드로어·뷰어)의 정적 상태를 고정한다.
 * 채팅 도메인이 이미 대표를 찍은 컴포넌트(확인 다이얼로그·팝오버)는 중복이라 제외하고,
 * 스토리 쪽에만 있는 패턴만 남긴다.
 */
test.describe('스토리 오버레이 비주얼', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(VISUAL_FIXED_NOW);
    await page.route(TAGS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tags),
      });
    });
  });

  test('키워드 추가 다이얼로그 (STORY-KEYWORD)', async ({ page }) => {
    await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
    await page.getByRole('button', { name: '키워드 추가' }).click();

    await expect(
      page.getByRole('dialog').getByRole('textbox', { name: '키워드' }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('add-tag-dialog.png');
  });

  test('선택한 키워드 드로어 (STORY-LINE)', async ({ page }) => {
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
    await page
      .getByRole('button', { name: SELECTED_TAGS_TRIGGER_LABEL })
      .click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('selected-tags-drawer.png');
  });

  test('썸네일 이미지 뷰어 (STORY-DETAIL-04)', async ({ page }) => {
    await page.route(STORY_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...storyDetail,
          thumbnailUrl: 'https://cdn.manyak.app/thumbnails/dragon.png',
        }),
      });
    });
    // 썸네일은 Next 이미지 최적화를 타므로 원본 URL이 아닌 최적화 엔드포인트를 가로챈다.
    await page.route('**/_next/image**', async (route) => {
      await route.fulfill({ contentType: 'image/png', body: TINY_PNG });
    });

    await page.goto('/stories/s1');
    await page.getByRole('button', { name: '썸네일 크게 보기' }).click();

    const viewer = page.getByRole('dialog', {
      name: '스토리 썸네일 크게 보기',
    });

    await expect(viewer).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('thumbnail-viewer.png');
  });

  test('제작 카드 옵션 다이얼로그 (STORY-LIST)', async ({ page }) => {
    await skipOnboarding(page);
    await seedStoryIds(page, ['s1']);
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([story('s1', '용의 계곡')]),
      });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);
    await page.getByRole('button', { name: '스토리 옵션 더보기' }).click();

    // 상단 축소판 + 항목 목록 대표 스냅샷이다(채팅 카드 옵션도 같은 컴포넌트).
    const dialog = page.getByRole('dialog', { name: '스토리 옵션' });

    await expect(
      dialog.getByRole('menuitem', { name: '삭제하기' }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('card-options-dialog.png');
  });

  test('스토리 신고 시트 (STORY-DETAIL)', async ({ page }) => {
    await mockMemberSession(page);
    await page.route(STORY_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(storyDetail),
      });
    });

    await page.goto('/stories/s1');
    await page.getByRole('button', { name: '스토리 옵션 더보기' }).click();
    await page
      .getByRole('menuitem', { name: STORY_REPORT_COPY.action })
      .click();

    const sheet = page.getByRole('dialog', { name: STORY_REPORT_COPY.title });

    await sheet.getByRole('radio', { name: '부적절한 내용' }).check();
    await expect(
      sheet.getByRole('button', { name: STORY_REPORT_COPY.submit }),
    ).toBeEnabled();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('story-report-sheet.png');
  });
});

/** 다크 모드 대표 스냅샷. 카드·FAB·하단 탭과 상세 히어로·배지·CTA의 토큰을 덮는다. */
test.describe('스토리 다크 모드 비주얼', () => {
  test.use({ colorScheme: 'dark' });

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(VISUAL_FIXED_NOW);
  });

  test('제작 목록 기본 상태 (다크)', async ({ page }) => {
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

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText('용의 계곡', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: '스토리 옵션 더보기' }),
    ).toHaveCount(2);
    await waitForDarkTheme(page);
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('story-list-default-dark.png');
  });

  test('스토리 상세 기본 상태 (다크)', async ({ page }) => {
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
    await waitForDarkTheme(page);
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('story-detail-default-dark.png');
  });
});
