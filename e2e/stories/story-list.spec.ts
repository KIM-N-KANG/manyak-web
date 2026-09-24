import type { Locator, Page } from '@playwright/test';

import { PULL_TO_REFRESH_COPY } from '@/components/motion/pull-to-refresh';
import { APP_PATH } from '@/constants/app-path';
// import { STORY_LIKE_COPY } from '@/features/stories/_shared/constants/story-like';
import { STORY_LIST_ERROR_TITLE } from '@/features/stories/_shared/constants/story-list';
import {
  STORY_LIST_COPY,
  STORY_LIST_FILTER_OPTIONS,
  STORY_LIST_SORT_OPTIONS,
} from '@/features/stories/list/constants';
import {
  CREATE_STORY_FAB_COPY,
  CREATED_STORY_LIST_COPY,
} from '@/features/studio/menu/constants';

import { mockMemberSession } from '../fixtures/auth';
import {
  expect,
  isPublicStoriesUrl,
  mockPublicStories,
  seedStoryIds,
  skipOnboarding,
  test,
} from '../fixtures/test';

// 스토리 목록은 localStorage의 ID로 POST /api/v1/stories/batch 를 호출해 카드를 그린다.
// customInstance가 응답 body를 { data, status }로 감싸므로, 모킹 body는 StorySummaryResponse 배열이다.
const STORIES_BATCH = '**/api/v1/stories/batch';

const story = (id: string, title: string) => ({
  id,
  title,
  oneLineIntro: '한 줄 소개입니다',
  genres: ['판타지'],
  createdAt: '2026-06-01T00:00:00Z',
});

// 당김 새로고침은 터치 전용이라 스크롤러에 터치 이벤트를 직접 보낸다(Playwright 터치스크린은 탭만 지원).
const dispatchTouch = (
  scroller: Locator,
  type: 'touchstart' | 'touchmove' | 'touchend',
  x: number,
  y: number,
) =>
  scroller.evaluate(
    (element, { type, x, y }) => {
      const touch = new Touch({
        identifier: 1,
        target: element,
        clientX: x,
        clientY: y,
      });

      element.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: type === 'touchend' ? [] : [touch],
          changedTouches: [touch],
        }),
      );
    },
    { type, x, y },
  );

// 제작 카드의 옵션 메뉴에서 호출하는 삭제 API를 목킹한다.
const mockStoryDelete = async (
  page: Page,
  id: string,
  onDelete?: () => void,
) => {
  await page.route(`**/api/v1/stories/${id}`, async (route) => {
    onDelete?.();
    await route.fulfill({ status: 204, body: '' });
  });
};

/** 홈 카드는 제목 아래에 제작자 닉네임을 보여주므로 author를 함께 준다. */
const originalStory = (id: string, title: string) => ({
  ...story(id, title),
  author: { id: 1, nickname: '마냑', profileImageUrl: null },
});

test.describe('홈·제작 스토리 목록', () => {
  test('기존 제작 URL을 새 studio URL로 이동시킨다 (KNK-994)', async ({
    page,
  }) => {
    await skipOnboarding(page);

    await page.goto(APP_PATH.LEGACY.CREATE);
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));

    await page.goto(APP_PATH.LEGACY.CREATE_STORY);
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );

    await page.goto(APP_PATH.LEGACY.STUDIO_STORY);
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );

    await page.goto(APP_PATH.LEGACY.NEW_STORY);
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
  });

  test('목록이 화면보다 길어도 FAB는 화면 아래에 붙어 있다 (STORY-LIST-11)', async ({
    page,
  }) => {
    const ids = Array.from({ length: 12 }, (_, index) => `s${index + 1}`);

    await seedStoryIds(page, ids);
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({
        json: ids.map((id) => story(id, `긴 목록 ${id}`)),
      });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText('긴 목록 s1', { exact: true })).toBeVisible();

    const fab = page.getByRole('link', {
      name: CREATE_STORY_FAB_COPY.accessibleLabel,
    });

    const scroller = page.getByRole('region', {
      name: PULL_TO_REFRESH_COPY.ariaLabel,
    });

    // 스크롤 전에도, 중간까지 내린 뒤에도 FAB는 뷰포트 안에 있다.
    await expect(fab).toBeInViewport();
    await scroller.evaluate((element) => element.scrollTo({ top: 400 }));
    await expect(fab).toBeInViewport();

    // 맨 위에서 당겨도 FAB는 목록과 함께 내려오지 않는다.
    await scroller.evaluate((element) => element.scrollTo({ top: 0 }));

    const restingBox = await fab.boundingBox();
    const box = await scroller.boundingBox();

    if (!restingBox || !box)
      throw new Error('FAB 또는 스크롤 영역을 찾지 못했다');

    const x = box.x + box.width / 2;

    await dispatchTouch(scroller, 'touchstart', x, box.y + 8);
    await dispatchTouch(scroller, 'touchmove', x, box.y + 208);
    await expect(page.getByText(PULL_TO_REFRESH_COPY.release)).toBeVisible();
    // 폭은 스크롤 상태에 따른 라벨 접힘 애니메이션으로 흔들리므로 세로 위치만 비교한다.
    expect((await fab.boundingBox())?.y).toBe(restingBox.y);
    await dispatchTouch(scroller, 'touchend', x, box.y + 208);
  });

  test('보관한 ID로 스토리 카드 목록을 보여준다 (US-2-1)', async ({ page }) => {
    await seedStoryIds(page, ['s1', 's2']);
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { ...story('s1', '용의 계곡'), likeCount: 1234 },
          story('s2', '별빛 항해'),
        ]),
      });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText('용의 계곡', { exact: true })).toBeVisible();
    await expect(page.getByText('별빛 항해', { exact: true })).toBeVisible();
    // KNK-1260: 스토리 게시·공유 기능 전까지 좋아요 UI를 숨긴다.
    // await expect(
    //   page.getByText(`${STORY_LIKE_COPY.count} 1,234`, { exact: true }),
    // ).toBeVisible();
    // await expect(
    //   page.getByText(`${STORY_LIKE_COPY.count} 0`, { exact: true }),
    // ).toBeVisible();
    await page
      .getByRole('button', { name: '스토리 옵션 더보기' })
      .first()
      .click();
    await expect(
      page.getByRole('dialog').getByText('용의 계곡', { exact: true }),
    ).toBeVisible();
    // await expect(
    //   page
    //     .getByRole('dialog')
    //     .getByText(`${STORY_LIKE_COPY.count} 1,234`, { exact: true }),
    // ).toBeVisible();
  });

  test('홈 공개 목록과 내가 만든 스토리를 홈·제작 화면에 나눠 보여준다 (KNK-988)', async ({
    page,
  }) => {
    await seedStoryIds(page, ['s1']);
    await mockPublicStories(page, [originalStory('o1', '마냑의 첫 이야기')]);
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
    await expect(page.getByText('용의 계곡', { exact: true })).toBeHidden();
    // 섹션 제목 대신 필터 칩·정렬 줄을 둔다(KNK-1421).
    await expect(
      page.getByRole('main').getByRole('heading', { level: 2 }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('group', { name: STORY_LIST_COPY.filterGroupLabel }),
    ).toBeVisible();
    // 홈 카드에는 옵션 버튼을 두지 않는다.
    await expect(
      page.getByRole('button', { name: '스토리 옵션 더보기' }),
    ).toHaveCount(0);

    await page
      .getByRole('navigation', { name: '하단 네비게이션' })
      .getByRole('link', { name: '제작' })
      .click();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(page.getByText('용의 계곡', { exact: true })).toBeVisible();
    await expect(
      page.getByText('마냑의 첫 이야기', { exact: true }),
    ).toBeHidden();
    // 필터·정렬 줄은 홈에서만 헤더 아래에 둔다.
    await expect(
      page.getByRole('group', { name: STORY_LIST_COPY.filterGroupLabel }),
    ).toHaveCount(0);

    await expect(
      page.getByRole('main').getByRole('heading', { level: 2 }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: CREATE_STORY_FAB_COPY.accessibleLabel }),
    ).toBeVisible();

    const storyOptionsButton = page.getByRole('button', {
      name: '스토리 옵션 더보기',
    });
    const createdStoryLink = page.getByRole('link', {
      name: '용의 계곡 상세 보기',
    });
    const createdStoryCard = createdStoryLink.locator('..');
    const createdStoryCover = createdStoryCard.locator(
      '[data-slot="aspect-ratio"]',
    );
    // 표지·본문 간격은 본체 컨테이너가 가진다(KNK-1186).
    const createdStoryBody = createdStoryCover.locator('..');
    const createdStoryTitle = createdStoryCard.getByText('용의 계곡', {
      exact: true,
    });

    await expect(storyOptionsButton).toBeVisible();
    await expect(storyOptionsButton).toHaveCSS('width', '24px');
    await expect(storyOptionsButton).toHaveCSS('height', '24px');
    await expect(createdStoryCard).toHaveCSS('display', 'flex');
    await expect(createdStoryBody).toHaveCSS('column-gap', '16px');
    await expect(createdStoryCard).toHaveCSS('padding-top', '8px');
    await expect(createdStoryCard).toHaveCSS('padding-right', '16px');
    await expect(createdStoryCard).toHaveCSS('padding-bottom', '8px');
    await expect(createdStoryCard).toHaveCSS('padding-left', '16px');
    await expect(createdStoryCover).toHaveCSS('width', '128px');
    await expect(createdStoryTitle).toHaveCSS('-webkit-line-clamp', '2');
    await expect(createdStoryCard.getByText('2026-06-01')).toBeVisible();

    const [mainBox, cardBox, linkBox] = await Promise.all([
      page.getByRole('main').boundingBox(),
      createdStoryCard.boundingBox(),
      createdStoryLink.boundingBox(),
    ]);

    expect(mainBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(linkBox).not.toBeNull();
    expect(cardBox?.x).toBeCloseTo(mainBox?.x ?? 0);
    expect(cardBox?.width).toBeCloseTo(mainBox?.width ?? 0);
    expect(linkBox).toEqual(cardBox);
  });

  test('홈을 위에서 당기면 공개 목록을 다시 읽고 그동안 기존 카드를 유지한다 (STORY-LIST-30)', async ({
    page,
  }) => {
    await skipOnboarding(page);

    let originalsRequestCount = 0;
    let releaseRefetch: () => void = () => {};

    await page.route(isPublicStoriesUrl, async (route) => {
      originalsRequestCount += 1;

      // 두 번째(당김) 조회는 붙잡아 새로고침 중 표시자를 관찰한다.
      if (originalsRequestCount > 1) {
        await new Promise<void>((resolve) => {
          releaseRefetch = resolve;
        });
      }

      await route.fulfill({
        json: {
          items: [originalStory('o1', '마냑의 첫 이야기')],
          nextCursor: null,
        },
      });
    });

    await page.goto('/');

    const card = page.getByRole('link', { name: '마냑의 첫 이야기 상세 보기' });

    await expect(card).toBeVisible();

    const scroller = page.getByRole('region', {
      name: PULL_TO_REFRESH_COPY.ariaLabel,
    });
    const box = await scroller.boundingBox();

    if (!box) throw new Error('스크롤 영역을 찾지 못했다');

    const x = box.x + box.width / 2;
    const startY = box.y + 8;

    await dispatchTouch(scroller, 'touchstart', x, startY);

    for (let step = 1; step <= 10; step += 1) {
      await dispatchTouch(scroller, 'touchmove', x, startY + step * 20);
    }

    await expect(page.getByText(PULL_TO_REFRESH_COPY.release)).toBeVisible();
    await dispatchTouch(scroller, 'touchend', x, startY + 200);

    await expect(page.getByText(PULL_TO_REFRESH_COPY.refreshing)).toBeVisible();
    await expect.poll(() => originalsRequestCount).toBe(2);
    // 응답을 기다리는 동안 기존 카드가 사라지지 않는다.
    await expect(card).toBeVisible();

    releaseRefetch();

    await expect(page.getByText(PULL_TO_REFRESH_COPY.refreshing)).toBeHidden();
    await expect(card).toBeVisible();
  });

  test('만든 스토리가 없는 게스트도 오리지널 스토리를 본다 (KNK-983)', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockPublicStories(page, [originalStory('o1', '마냑의 첫 이야기')]);

    await page.goto('/');

    await expect(
      page.getByRole('banner').getByRole('link', { name: '로그인' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '마냑의 첫 이야기 상세 보기' }),
    ).toBeVisible();
    await expect(
      page.getByText(CREATED_STORY_LIST_COPY.emptyTitle),
    ).toBeHidden();

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(
      page.getByText(CREATED_STORY_LIST_COPY.emptyTitle),
    ).toBeVisible();
  });

  test('만든 스토리가 없는 제작 화면은 한 줄 안내와 FAB만 표시한다 (KNK-988·KNK-1355)', async ({
    page,
  }) => {
    await skipOnboarding(page);

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(
      page.getByRole('main').getByRole('heading', { level: 2 }),
    ).toHaveCount(0);
    await expect(
      page.getByText(CREATED_STORY_LIST_COPY.emptyTitle),
    ).toBeVisible();
    // 앱과 같이 빈 상태에도 별도 CTA 없이 FAB 하나만 둔다.
    await expect(
      page.getByRole('button', { name: '스토리 만들기' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: CREATE_STORY_FAB_COPY.accessibleLabel }),
    ).toBeVisible();
  });

  test('홈 카드는 제작자를 보여주고 오리지널 필터에서만 ORIGINAL 태그를 붙인다 (KNK-983·KNK-1421)', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockPublicStories(page, [originalStory('o1', '마냑의 첫 이야기')]);

    await page.goto('/');

    // 홈 카드는 닉네임 앞에 @를 붙인다
    await expect(page.getByText('@마냑', { exact: true })).toBeVisible();
    // 내가 만든 스토리 카드와 달리 한 줄 소개·장르는 노출하지 않는다.
    await expect(page.getByText('한 줄 소개입니다')).toBeHidden();
    // 응답에 오리지널 여부가 없어 전체 필터에서는 태그를 붙이지 않는다.
    await expect(page.getByRole('img', { name: '오리지널' })).toHaveCount(0);

    await page.getByRole('button', { name: '오리지널', exact: true }).click();

    await expect(page.getByRole('img', { name: '오리지널' })).toBeVisible();
  });

  test('필터·정렬을 바꾸면 URL과 요청에 반영하고 상세에서 돌아와도 유지한다 (KNK-1421)', async ({
    page,
  }) => {
    await skipOnboarding(page);

    const requests: URLSearchParams[] = [];

    await page.route(isPublicStoriesUrl, async (route) => {
      const params = new URL(route.request().url()).searchParams;

      requests.push(params);
      await route.fulfill({
        json: {
          items: [
            originalStory(
              `${params.get('filter')}-${params.get('sort')}`,
              `${params.get('filter')} ${params.get('sort')} 스토리`,
            ),
          ],
          nextCursor: null,
        },
      });
    });
    await page.route('**/api/v1/stories/original-latest', (route) =>
      route.fulfill({ json: originalStory('original-latest', '상세') }),
    );

    await page.goto('/');

    const [allLabel, originalLabel] = STORY_LIST_FILTER_OPTIONS.map(
      (option) => option.label,
    );
    const [likesLabel, latestLabel] = STORY_LIST_SORT_OPTIONS.map(
      (option) => option.label,
    );
    const allChip = page.getByRole('button', { name: allLabel, exact: true });
    const originalChip = page.getByRole('button', {
      name: originalLabel,
      exact: true,
    });

    // 기본은 전체·인기순이다.
    await expect(page.getByText('all likes 스토리')).toBeVisible();
    await expect(allChip).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', {
        name: `${STORY_LIST_COPY.sortTriggerLabel}: ${likesLabel}`,
      }),
    ).toBeVisible();

    await originalChip.click();

    await expect(page).toHaveURL(/\/\?filter=original$/);
    await expect(page.getByText('original likes 스토리')).toBeVisible();
    await expect(originalChip).toHaveAttribute('aria-pressed', 'true');

    await page
      .getByRole('button', {
        name: `${STORY_LIST_COPY.sortTriggerLabel}: ${likesLabel}`,
      })
      .click();
    await page.getByRole('menuitemradio', { name: latestLabel }).click();

    await expect(page).toHaveURL(/\/\?filter=original&sort=latest$/);
    await expect(page.getByText('original latest 스토리')).toBeVisible();
    expect(requests.at(-1)?.get('filter')).toBe('original');
    expect(requests.at(-1)?.get('sort')).toBe('latest');

    await page
      .getByRole('link', { name: 'original latest 스토리 상세 보기' })
      .click();
    await expect(page).toHaveURL(/\/stories\/original-latest$/);
    await page.goBack();

    await expect(page.getByText('original latest 스토리')).toBeVisible();
    await expect(originalChip).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', {
        name: `${STORY_LIST_COPY.sortTriggerLabel}: ${latestLabel}`,
      }),
    ).toBeVisible();
  });

  test('목록 끝에 닿으면 같은 필터·정렬로 다음 페이지를 이어 붙인다 (KNK-1421)', async ({
    page,
  }) => {
    await skipOnboarding(page);

    const requests: URLSearchParams[] = [];

    await page.route(isPublicStoriesUrl, async (route) => {
      const params = new URL(route.request().url()).searchParams;

      requests.push(params);

      if (params.get('cursor') === 'c1') {
        await route.fulfill({
          json: {
            items: [originalStory('p2', '다음 페이지')],
            nextCursor: null,
          },
        });

        return;
      }

      await route.fulfill({
        json: {
          items: Array.from({ length: 20 }, (_, index) =>
            originalStory(`p1-${index}`, `첫 페이지 ${index}`),
          ),
          nextCursor: 'c1',
        },
      });
    });

    await page.goto('/?sort=chats');

    await expect(page.getByText('첫 페이지 0', { exact: true })).toBeVisible();
    await page
      .getByText('첫 페이지 19', { exact: true })
      .scrollIntoViewIfNeeded();

    await expect(page.getByText('다음 페이지', { exact: true })).toBeVisible();

    const nextRequest = requests.find((params) => params.get('cursor'));

    expect(nextRequest?.get('filter')).toBe('all');
    expect(nextRequest?.get('sort')).toBe('chats');
  });

  test('홈 카드에는 회원에게도 옵션 버튼을 두지 않는다 (KNK-1421)', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await skipOnboarding(page);
    await mockPublicStories(page, [originalStory('o1', '마냑의 첫 이야기')]);

    await page.goto('/');

    await expect(
      page.getByRole('link', { name: '마냑의 첫 이야기 상세 보기' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '스토리 옵션 더보기' }),
    ).toHaveCount(0);
  });

  test('공개 스토리가 없으면 필터 줄 아래에 빈 안내를 보여준다 (KNK-1421)', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockPublicStories(page, []);

    await page.goto('/');

    await expect(
      page.getByRole('group', { name: STORY_LIST_COPY.filterGroupLabel }),
    ).toBeVisible();
    await expect(page.getByText(STORY_LIST_COPY.empty)).toBeVisible();
  });

  test('공개 목록 로드에 실패하면 다시 시도로 복구한다', async ({ page }) => {
    await skipOnboarding(page);

    let callCount = 0;

    await page.route(isPublicStoriesUrl, async (route) => {
      callCount += 1;

      if (callCount === 1) {
        await route.fulfill({ status: 500, body: '{}' });

        return;
      }

      await route.fulfill({
        json: {
          items: [originalStory('o1', '마냑의 첫 이야기')],
          nextCursor: null,
        },
      });
    });

    await page.goto('/');

    await expect(
      page.getByRole('group', { name: STORY_LIST_COPY.filterGroupLabel }),
    ).toBeVisible();
    await expect(page.getByText(STORY_LIST_ERROR_TITLE)).toBeVisible();

    await page.getByRole('button', { name: '다시 시도하기' }).click();

    await expect(
      page.getByText('마냑의 첫 이야기', { exact: true }),
    ).toBeVisible();
  });

  test('공개 목록 로딩 중에는 카드 구조에 맞는 스켈레톤을 보여준다 (KNK-988)', async ({
    page,
  }) => {
    await skipOnboarding(page);

    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });

    await page.route(isPublicStoriesUrl, async (route) => {
      await responseGate;
      await route.fulfill({ json: { items: [], nextCursor: null } });
    });

    await page.goto('/');

    const loading = page.getByRole('status', {
      name: STORY_LIST_COPY.loadingLabel,
    });

    await expect(loading).toBeVisible();
    // 카드 6개의 썸네일·제목·제작자 3개씩이다.
    await expect(loading.locator('[data-slot="skeleton"]')).toHaveCount(18);

    releaseResponse();
    await expect(loading).toBeHidden();
  });

  test('제작 목록 로딩 중에는 가로 카드 구조와 같은 스켈레톤을 보여준다 (KNK-1043)', async ({
    page,
  }) => {
    await seedStoryIds(page, ['s1']);

    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });

    await page.route(STORIES_BATCH, async (route) => {
      await responseGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([story('s1', '용의 계곡')]),
      });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);

    const skeletonList = page.locator('main ul[aria-hidden="true"]');
    const skeletonRows = skeletonList.locator(':scope > li');
    const firstRow = skeletonRows.first();
    const cover = firstRow.locator('[data-slot="aspect-ratio"]');

    await expect(skeletonList).toBeVisible();
    await expect(skeletonRows).toHaveCount(5);
    await expect(firstRow).toHaveCSS('display', 'flex');
    await expect(firstRow).toHaveCSS('column-gap', '16px');
    await expect(firstRow).toHaveCSS('padding-top', '8px');
    await expect(firstRow).toHaveCSS('padding-right', '16px');
    await expect(firstRow).toHaveCSS('padding-bottom', '8px');
    await expect(firstRow).toHaveCSS('padding-left', '16px');
    await expect(cover).toHaveCSS('width', '128px');

    releaseResponse();
    await expect(
      page.getByRole('link', { name: '용의 계곡 상세 보기' }),
    ).toBeVisible();
  });

  test('게스트는 헤더의 로그인 버튼으로 로그인 화면에 간다', async ({
    page,
  }) => {
    await skipOnboarding(page);

    await page.goto('/');
    await page
      .getByRole('banner')
      .getByRole('link', { name: '로그인' })
      .click();

    await expect(page).toHaveURL(/\/login$/);
  });

  test('로그인 상태에서는 메인 헤더에 로그인 버튼이 없다', async ({ page }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);

    for (const pathname of [
      APP_PATH.MAIN.STORIES,
      APP_PATH.MAIN.CHATS,
      APP_PATH.MAIN.STUDIO,
      APP_PATH.MAIN.MY,
    ]) {
      await page.goto(pathname);

      await expect(
        page.getByRole('banner').getByRole('link', { name: '로그인' }),
      ).toHaveCount(0);
    }
  });

  test('카드를 누르면 스토리 상세로 이동한다 (US-2-2)', async ({ page }) => {
    await seedStoryIds(page, ['s1']);
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([story('s1', '용의 계곡')]),
      });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);
    await page.getByRole('link', { name: '용의 계곡 상세 보기' }).click();

    await expect(page).toHaveURL(/\/stories\/s1$/);
  });

  test('로드에 실패하면 다시 시도로 복구한다 (US-2-6)', async ({ page }) => {
    await seedStoryIds(page, ['s1']);

    let callCount = 0;

    await page.route(STORIES_BATCH, async (route) => {
      callCount += 1;

      if (callCount === 1) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: '{}',
        });

        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([story('s1', '용의 계곡')]),
      });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText(STORY_LIST_ERROR_TITLE)).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('heading', { level: 2 }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: CREATE_STORY_FAB_COPY.accessibleLabel }),
    ).toHaveCount(0);

    await page.getByRole('button', { name: '다시 시도하기' }).click();

    await expect(page.getByText('용의 계곡', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('link', { name: CREATE_STORY_FAB_COPY.accessibleLabel }),
    ).toBeVisible();
  });

  test('스토리를 삭제하면 완료 안내가 뜬다 (US-2-4)', async ({ page }) => {
    await seedStoryIds(page, ['s1']);
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([story('s1', '용의 계곡')]),
      });
    });
    await mockStoryDelete(page, 's1');

    await page.goto(APP_PATH.MAIN.STUDIO);

    const optionsButton = page.getByRole('button', {
      name: '스토리 옵션 더보기',
    });

    await expect(optionsButton).toHaveCSS('width', '24px');
    await expect(optionsButton).toHaveCSS('height', '24px');
    await optionsButton.click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));

    // 카드 옵션 시트는 머리글에 카드 종류와 제목을 보여주고, 삭제는 시트를 닫은 뒤 확인 다이얼로그로 확정한다.
    const dialog = page.getByRole('dialog', { name: '용의 계곡' });

    await expect(
      dialog.getByText('내가 만든 스토리', { exact: true }),
    ).toBeVisible();
    await dialog.getByRole('menuitem', { name: '삭제하기' }).click();

    const confirmDialog = page.getByRole('alertdialog');

    await expect(confirmDialog.getByText('스토리를 삭제할까요?')).toBeVisible();
    await confirmDialog.getByRole('button', { name: '삭제하기' }).click();

    await expect(page.getByText('스토리가 삭제되었어요')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    // 옵션 시트 머리글에도 같은 제목이 있으므로 카드(article) 안으로 좁힌다.
    await expect(
      page.getByRole('article').getByText('용의 계곡', { exact: true }),
    ).not.toBeVisible();
  });

  test('로그인 상태에서는 서버의 내 스토리 목록을 보여준다', async ({
    page,
  }) => {
    // 로컬 ID 없이 회원 목록 API만으로 카드를 그린다(이관도 발동하지 않음).
    await skipOnboarding(page);
    await mockMemberSession(page);
    await page.route('**/api/v1/users/me/stories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([story('s1', '회원의 서재')]),
      });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText('회원의 서재', { exact: true })).toBeVisible();
    await page
      .getByRole('link', { name: CREATE_STORY_FAB_COPY.accessibleLabel })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
  });

  test('로그인 상태에서 스토리를 삭제하면 목록에서 사라진다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);

    let deleted = false;

    await page.route('**/api/v1/users/me/stories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(deleted ? [] : [story('s1', '회원의 서재')]),
      });
    });
    await mockStoryDelete(page, 's1', () => {
      deleted = true;
    });

    await page.goto(APP_PATH.MAIN.STUDIO);
    await page.getByRole('button', { name: '스토리 옵션 더보기' }).click();
    await page.getByRole('menuitem', { name: '삭제하기' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: '삭제하기' })
      .click();

    await expect(page.getByText('스토리가 삭제되었어요')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(
      page.getByRole('article').getByText('회원의 서재', { exact: true }),
    ).not.toBeVisible();
  });
});
