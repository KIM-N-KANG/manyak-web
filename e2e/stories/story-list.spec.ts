import type { Locator, Page } from '@playwright/test';

import { PULL_TO_REFRESH_COPY } from '@/components/motion/pull-to-refresh';
import { APP_PATH } from '@/constants/app-path';
import { DRAFT_SAVE_BUTTON_LABEL } from '@/features/stories/_shared/components/draft-save-button';
import { STORY_LIKE_COPY } from '@/features/stories/_shared/constants/story-like';
import {
  STORY_LIST_COPY,
  STORY_LIST_ERROR_TITLE,
} from '@/features/stories/_shared/constants/story-list';
import { STORY_VISIBILITY_COPY } from '@/features/stories/_shared/constants/story-visibility';
import {
  GENERAL_STORY_CREATE_COPY,
  GENERAL_STORY_TABS,
  GENERAL_STORY_TEXT_FIELDS,
} from '@/features/studio/general/constants';
import {
  CREATE_STORY_FAB_COPY,
  CREATED_STORY_LIST_COPY,
} from '@/features/studio/menu/constants';
import { STORY_MODE_SELECT_COPY } from '@/features/studio/story/constants';

import { mockMemberSession } from '../fixtures/auth';
import { findOverflowingTexts, UNBROKEN_TEXT } from '../fixtures/layout';
import {
  expect,
  isHomeStoriesUrl,
  mockExploreStories,
  mockHomeSections,
  mockHomeStories,
  seedStoryIds,
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
    await page.goto(APP_PATH.LEGACY.CREATE);
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));

    await page.goto(APP_PATH.LEGACY.CREATE_STORY);
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );

    await page.goto(APP_PATH.LEGACY.NEW_STORY);
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
  });

  test('FAB는 제작 방식 선택 화면으로 이동하고, 일반 제작은 입력 탭을 바꾸고 입력 없이 닫으면 묻지 않고 제작 탭으로 나간다 (STORY-LIST-38)', async ({
    page,
  }) => {
    // 일반 제작은 회원 전용이다. 게스트 흐름은 STORY-GENERAL-23에서 다룬다.
    await mockMemberSession(page);
    await page.goto(APP_PATH.MAIN.STUDIO);
    await page
      .getByRole('link', { name: CREATE_STORY_FAB_COPY.accessibleLabel })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SELECT}$`),
    );
    await expect(
      page.getByRole('banner').getByText(STORY_MODE_SELECT_COPY.title),
    ).toBeVisible();
    // 일러스트는 장식이라 선택지의 접근 가능한 이름은 제목과 설명뿐이다.
    await expect(
      page.getByRole('link', {
        name: `${STORY_MODE_SELECT_COPY.simple.title} ${STORY_MODE_SELECT_COPY.simple.description}`,
        exact: true,
      }),
    ).toHaveAttribute('href', APP_PATH.STUDIO.STORY.SIMPLE);

    await page
      .getByRole('link', { name: STORY_MODE_SELECT_COPY.general.title })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.GENERAL}$`),
    );
    await expect(
      page.getByRole('banner').getByText(GENERAL_STORY_CREATE_COPY.title),
    ).toBeVisible();
    // 첫 탭(스토리 프로필)이 열리고, 탭을 바꾸면 그 탭의 입력 항목이 보인다.
    await expect(
      page.getByRole('tab', { name: GENERAL_STORY_TABS[0].label }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByLabel(GENERAL_STORY_TEXT_FIELDS.title.label),
    ).toBeVisible();
    await page.getByRole('tab', { name: GENERAL_STORY_TABS[1].label }).click();
    await expect(
      page.getByLabel(GENERAL_STORY_TEXT_FIELDS.world.label),
    ).toBeVisible();
    // 자동 저장이 없고 저장할 입력도 없으니 임시 저장 버튼은 잠겨 있다.
    await expect(
      page.getByRole('button', { name: DRAFT_SAVE_BUTTON_LABEL }),
    ).toBeDisabled();

    // 잃을 것이 없으니 닫기는 묻지 않고 나간다.
    await page
      .getByRole('button', { name: GENERAL_STORY_CREATE_COPY.close })
      .click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
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
          {
            ...story('s1', '용의 계곡'),
            likeCount: 1234,
            visibility: 'PUBLIC',
          },
          { ...story('s2', '별빛 항해'), visibility: 'PRIVATE' },
        ]),
      });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText('용의 계곡', { exact: true })).toBeVisible();
    await expect(page.getByText('별빛 항해', { exact: true })).toBeVisible();

    // 좋아요 수와 턴 수는 표지 배지로, 하단 메타 줄은 공개 범위와 제작일로 보인다.
    const covers = page.locator('[data-slot="aspect-ratio"]');

    await expect(
      covers
        .first()
        .getByText(`${STORY_LIKE_COPY.count} 1.2K`, { exact: true }),
    ).toBeVisible();
    await expect(
      covers.nth(1).getByText(`${STORY_LIKE_COPY.count} 0`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(STORY_VISIBILITY_COPY.PUBLIC, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(STORY_VISIBILITY_COPY.PRIVATE, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: '스토리 옵션 더보기' })
      .first()
      .click();
    await expect(
      page.getByRole('dialog').getByText('용의 계곡', { exact: true }),
    ).toBeVisible();
  });

  test('홈 공개 목록과 내가 만든 스토리를 홈·제작 화면에 나눠 보여준다 (KNK-988)', async ({
    page,
  }) => {
    await seedStoryIds(page, ['s1']);
    await mockHomeStories(page, [originalStory('o1', '마냑의 첫 이야기')]);
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
    await expect(
      page.getByRole('main').getByRole('heading', { name: '인기 스토리' }),
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

  test('홈을 위에서 당기면 홈 목록을 다시 읽고 그동안 기존 카드를 유지한다 (STORY-LIST-30)', async ({
    page,
  }) => {
    let originalsRequestCount = 0;
    let releaseRefetch: () => void = () => {};

    await page.route(isHomeStoriesUrl, async (route) => {
      originalsRequestCount += 1;

      // 두 번째(당김) 조회는 붙잡아 새로고침 중 표시자를 관찰한다.
      if (originalsRequestCount > 1) {
        await new Promise<void>((resolve) => {
          releaseRefetch = resolve;
        });
      }

      await route.fulfill({
        json: {
          sections: [
            {
              id: null,
              name: '인기 스토리',
              items: [originalStory('o1', '마냑의 첫 이야기')],
            },
          ],
        },
      });
    });

    await page.goto('/');

    const card = page.getByRole('link', { name: '마냑의 첫 이야기 상세 보기' });

    await expect(card).toBeVisible();

    const scroller = page.getByRole('region', {
      name: PULL_TO_REFRESH_COPY.ariaLabel,
    });
    const navigation = page.getByRole('navigation', {
      name: '하단 네비게이션',
    });

    await navigation.getByRole('link', { name: '마이' }).click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.MY}$`));
    await expect(scroller).toHaveAttribute('data-disabled', 'true');
    await dispatchTouch(scroller, 'touchstart', 100, 100);
    await dispatchTouch(scroller, 'touchmove', 100, 300);
    await dispatchTouch(scroller, 'touchend', 100, 300);
    await expect(scroller).toHaveAttribute('data-state', 'idle');

    await navigation.getByRole('link', { name: '홈', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STORIES}$`));
    await expect(card).toBeVisible();
    await expect(scroller).not.toHaveAttribute('data-disabled');

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

  test('당기다 손가락이 시작점 위로 넘어가면 표시자와 목록이 제자리로 돌아온다 (KNK-1640)', async ({
    page,
  }) => {
    await page.goto(APP_PATH.MAIN.STORIES);

    const scroller = page.getByRole('region', {
      name: PULL_TO_REFRESH_COPY.ariaLabel,
    });

    await expect(scroller).toBeVisible();

    const box = await scroller.boundingBox();

    if (!box) throw new Error('스크롤 영역을 찾지 못했다');

    const x = box.x + box.width / 2;
    const startY = box.y + 100;

    await dispatchTouch(scroller, 'touchstart', x, startY);
    await dispatchTouch(scroller, 'touchmove', x, startY + 40);
    await expect(scroller).toHaveAttribute('data-state', 'pulling');
    // 터치 이동은 띄엄띄엄 들어오므로 0 근처를 거치지 않고 시작점 위로 바로 넘어갈 수 있다.
    await dispatchTouch(scroller, 'touchmove', x, startY - 5);
    await dispatchTouch(scroller, 'touchend', x, startY - 5);

    await expect(scroller).toHaveAttribute('data-state', 'idle');
    await expect(scroller.locator('[aria-live="polite"]')).toHaveCSS(
      'opacity',
      '0',
    );
  });

  test('만든 스토리가 없는 게스트도 오리지널 스토리를 본다 (KNK-983)', async ({
    page,
  }) => {
    await mockHomeStories(page, [originalStory('o1', '마냑의 첫 이야기')]);

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

  test('홈 카드는 표지에 턴 수, 아래에 제목, 한 줄 소개와 장르를 보이고 오리지널 스토리에만 ORIGINAL 태그를 붙인다 (STORY-LIST-29)', async ({
    page,
  }) => {
    await mockHomeStories(page, [
      {
        ...originalStory('o1', '마냑의 첫 이야기'),
        isOriginal: true,
        turnCount: 302,
      },
      {
        ...story('u1', '사용자 이야기'),
        author: { id: 2, nickname: '작가', profileImageUrl: null },
        genres: ['로맨스 판타지', '아카데미', '미스터리', '성장'],
      },
    ]);

    await page.goto('/');

    const originalCard = page
      .getByRole('listitem')
      .filter({ hasText: '마냑의 첫 이야기' });

    await expect(originalCard.getByText('한 줄 소개입니다')).toBeVisible();
    await expect(originalCard.getByText('누적 턴 수 302')).toBeVisible();
    // 장르 배지는 너비를 재는 숨은 사본이 함께 있어 보이는 것만 고른다.
    await expect(
      originalCard
        .getByText('판타지', { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
    // 작성자는 상세에서 보이고 홈 카드에는 두지 않는다.
    await expect(page.getByText(/^@/)).toHaveCount(0);

    // 장르는 한 줄만 보이고 넘치면 나머지 수를 +N으로 줄인다.
    const userCard = page
      .getByRole('listitem')
      .filter({ hasText: '사용자 이야기' });

    await expect(
      userCard.getByText(/^\+\d+$/).filter({ visible: true }),
    ).toBeVisible();
    // 응답의 isOriginal인 카드에만 표지 위 태그를 붙인다.
    await expect(page.getByRole('img', { name: '오리지널' })).toHaveCount(1);
    await expect(
      originalCard.getByRole('img', { name: '오리지널' }),
    ).toBeVisible();
  });

  test('상세에서 돌아오거나 탭을 오가도 목록 스크롤 위치를 유지한다 (KNK-1613)', async ({
    page,
  }) => {
    await mockHomeSections(
      page,
      Array.from({ length: 6 }, (_, section) => ({
        id: `section-${section + 1}`,
        name: `섹션 ${section + 1}`,
        items: [1, 2].map((offset) => {
          const index = section * 2 + offset;

          return originalStory(`o${index}`, `긴 목록 ${index}`);
        }),
      })),
    );

    await page.goto('/');
    await expect(page.getByText('긴 목록 1', { exact: true })).toBeVisible();

    const scroller = page.getByRole('region', {
      name: PULL_TO_REFRESH_COPY.ariaLabel,
    });

    // 카드를 보이게 내린 위치가 떠날 때의 위치다.
    const link = page.getByRole('link', { name: '긴 목록 9 상세 보기' });

    await link.scrollIntoViewIfNeeded();

    const leftAt = await scroller.evaluate((element) => element.scrollTop);

    expect(leftAt).toBeGreaterThan(0);
    await link.click();
    await expect(page).toHaveURL(/\/stories\/o9$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect
      .poll(() => scroller.evaluate((element) => element.scrollTop))
      .toBe(leftAt);

    // 탭을 오가도 각 탭이 떠날 때의 위치를 기억한다.
    const navigation = page.getByRole('navigation', {
      name: '하단 네비게이션',
    });

    await navigation.getByRole('link', { name: '채팅' }).click();
    await expect(page).toHaveURL(/\/chats$/);
    await expect
      .poll(() => scroller.evaluate((element) => element.scrollTop))
      .toBe(0);
    await navigation.getByRole('link', { name: '홈' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect
      .poll(() => scroller.evaluate((element) => element.scrollTop))
      .toBe(leftAt);
  });

  test('홈은 서버 순서대로 섹션을 쌓고 섹션마다 카드를 가로로 2.2장 보인다 (STORY-LIST-46)', async ({
    page,
  }) => {
    await mockHomeSections(page, [
      {
        id: 'section-1',
        name: '지금 인기 있는 스토리',
        items: [
          originalStory('a1', '첫 카드'),
          { ...story('a2', '작성자 없는 카드'), author: null },
          originalStory('a3', '셋째 카드'),
        ],
      },
      {
        name: '오리지널 스토리',
        items: [originalStory('b1', '오리지널 카드')],
      },
    ]);

    await page.goto('/');

    const main = page.getByRole('main');

    await expect(main.getByRole('heading', { level: 2 })).toHaveText([
      '지금 인기 있는 스토리',
      '오리지널 스토리',
    ]);

    const row = main
      .getByRole('region', { name: '지금 인기 있는 스토리' })
      .getByRole('list');

    await expect(row).toHaveCSS('overflow-x', 'auto');

    const [rowWidth, cardWidth] = await row.evaluate((element) => [
      element.clientWidth,
      element.querySelector('li')?.getBoundingClientRect().width ?? 0,
    ]);

    // 왼쪽 여백 16px 뒤에 카드 두 장과 8px 간격 두 개, 셋째 카드의 0.2장이 보인다.
    expect(cardWidth * 2.2 + 16).toBeCloseTo(rowWidth - 16, 0);

    const authorlessCard = row
      .getByRole('listitem')
      .filter({ hasText: '작성자 없는 카드' });

    await expect(
      authorlessCard.getByRole('link', { name: '작성자 없는 카드 상세 보기' }),
    ).toBeVisible();
    await expect(authorlessCard.getByText(/^@/)).toHaveCount(0);
  });

  test('탐색 탭은 제작과 마이 사이에 있고, 탭으로 들어오면 새로 섞고 상세에서 돌아오면 순서와 위치를 유지한다 (STORY-LIST-47)', async ({
    page,
  }) => {
    const explore = await mockExploreStories(page, [
      Array.from({ length: 30 }, (_, index) =>
        originalStory(`e${index + 1}`, `탐색 ${index + 1}`),
      ),
    ]);

    await page.goto('/');

    const navigation = page.getByRole('navigation', {
      name: '하단 네비게이션',
    });
    const scroller = page.getByRole('region', {
      name: PULL_TO_REFRESH_COPY.ariaLabel,
    });

    await expect(navigation.getByRole('link')).toHaveText([
      '홈',
      '채팅',
      '제작',
      '탐색',
      '마이',
    ]);
    await navigation.getByRole('link', { name: '탐색' }).click();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.EXPLORE}$`));
    await expect(
      page.getByRole('banner').getByRole('heading', { name: '탐색' }),
    ).toBeVisible();

    // 썸네일만 세 열로 붙여 놓고 턴 수, 제목과 작성자는 보이지 않는다.
    const tiles = page.getByRole('main').getByRole('listitem');

    await expect(tiles).toHaveCount(30);

    const tops = await tiles.evaluateAll((items) =>
      items.slice(0, 4).map((item) => item.getBoundingClientRect().top),
    );

    expect(new Set(tops.slice(0, 3)).size).toBe(1);
    expect(tops[3]).toBeGreaterThan(tops[0]);
    await expect(page.getByText('탐색 1', { exact: true })).toHaveCount(0);
    await expect(page.getByText('@마냑', { exact: true })).toHaveCount(0);
    await expect(page.getByText('누적 턴 수')).toHaveCount(0);

    const link = page.getByRole('link', { name: '탐색 27 상세 보기' });

    await link.scrollIntoViewIfNeeded();

    const leftAt = await scroller.evaluate((element) => element.scrollTop);

    expect(leftAt).toBeGreaterThan(0);
    await link.click();
    await expect(page).toHaveURL(/\/stories\/e27$/);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.EXPLORE}$`));
    await expect
      .poll(() => scroller.evaluate((element) => element.scrollTop))
      .toBe(leftAt);
    expect(explore.cursors).toEqual([null]);

    await navigation.getByRole('link', { name: '홈', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STORIES}$`));
    await navigation.getByRole('link', { name: '탐색' }).click();

    await expect(link).toBeVisible();
    expect(explore.cursors).toEqual([null, null]);
    await expect
      .poll(() => scroller.evaluate((element) => element.scrollTop))
      .toBe(0);
  });

  test('탐색을 당겨서 새로고침하면 첫 페이지만 새로 섞어 받는다 (STORY-LIST-48)', async ({
    page,
  }) => {
    const explore = await mockExploreStories(page, [
      Array.from({ length: 20 }, (_, index) =>
        originalStory(`p1-${index}`, `첫 페이지 ${index}`),
      ),
      [originalStory('p2', '다음 페이지')],
    ]);

    await page.goto(APP_PATH.MAIN.EXPLORE);
    await page
      .getByRole('link', { name: '첫 페이지 19 상세 보기' })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('link', { name: '다음 페이지 상세 보기' }),
    ).toBeVisible();

    const scroller = page.getByRole('region', {
      name: PULL_TO_REFRESH_COPY.ariaLabel,
    });

    await scroller.evaluate((element) => element.scrollTo({ top: 0 }));

    const box = await scroller.boundingBox();

    if (!box) throw new Error('스크롤 영역을 찾지 못했다');

    const x = box.x + box.width / 2;
    const startY = box.y + 8;

    await dispatchTouch(scroller, 'touchstart', x, startY);

    for (let step = 1; step <= 10; step += 1) {
      await dispatchTouch(scroller, 'touchmove', x, startY + step * 20);
    }

    await dispatchTouch(scroller, 'touchend', x, startY + 200);

    await expect.poll(() => explore.cursors.length).toBe(3);
    await expect(page.getByText(PULL_TO_REFRESH_COPY.refreshing)).toBeHidden();
    await expect(
      page.getByRole('link', { name: '다음 페이지 상세 보기' }),
    ).toHaveCount(0);
    expect(explore.cursors).toEqual([null, 'c1', null]);
  });

  test('탐색을 새로 섞으면 칸 자리를 유지한 채 칸마다 새 표지로 바꾼다 (STORY-LIST-49)', async ({
    page,
  }) => {
    await mockExploreStories(page, [
      Array.from({ length: 6 }, (_, index) =>
        originalStory(`a${index}`, `이전 순서 ${index}`),
      ),
    ]);

    await page.goto(APP_PATH.MAIN.EXPLORE);

    const tiles = page.getByRole('main').getByRole('listitem');

    await expect(
      page.getByRole('link', { name: '이전 순서 0 상세 보기' }),
    ).toBeVisible();

    await mockExploreStories(page, [
      Array.from({ length: 6 }, (_, index) =>
        originalStory(`b${index}`, `새 순서 ${index}`),
      ),
    ]);

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

    await dispatchTouch(scroller, 'touchend', x, startY + 200);

    await expect(
      page.getByRole('link', { name: '새 순서 5 상세 보기' }),
    ).toBeVisible();
    await expect(tiles).toHaveCount(6);
    await expect(
      page.getByRole('link', { name: /이전 순서 \d 상세 보기/ }),
    ).toHaveCount(0);
  });

  test('탐색 목록 끝에 닿으면 받은 nextCursor로 다음 페이지를 이어 붙인다 (STORY-LIST-44)', async ({
    page,
  }) => {
    const explore = await mockExploreStories(page, [
      Array.from({ length: 20 }, (_, index) =>
        originalStory(`p1-${index}`, `첫 페이지 ${index}`),
      ),
      [originalStory('p2', '다음 페이지')],
    ]);

    await page.goto(APP_PATH.MAIN.EXPLORE);

    await expect(
      page.getByRole('link', { name: '첫 페이지 0 상세 보기' }),
    ).toBeVisible();
    await page
      .getByRole('link', { name: '첫 페이지 19 상세 보기' })
      .scrollIntoViewIfNeeded();

    await expect(
      page.getByRole('link', { name: '다음 페이지 상세 보기' }),
    ).toBeVisible();
    expect(explore.cursors).toEqual([null, 'c1']);
  });

  test('홈 카드에는 회원에게도 옵션 버튼을 두지 않는다 (KNK-1421)', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await mockHomeStories(page, [originalStory('o1', '마냑의 첫 이야기')]);

    await page.goto('/');

    await expect(
      page.getByRole('link', { name: '마냑의 첫 이야기 상세 보기' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '스토리 옵션 더보기' }),
    ).toHaveCount(0);
  });

  test('홈, 제작 카드는 채팅 횟수를 축약해 표시하고 홈 카드는 좋아요 수를 숨긴다 (KNK-1421, KNK-1900)', async ({
    page,
  }) => {
    await seedStoryIds(page, ['s1']);
    await mockHomeStories(page, [
      { ...originalStory('o1', '마냑의 첫 이야기'), turnCount: 12345 },
    ]);
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({
        json: [{ ...story('s1', '용의 계곡'), turnCount: 1280 }],
      });
    });

    await page.goto('/');

    await expect(page.getByText('누적 턴 수 12.3K')).toBeVisible();
    await expect(page.getByText(STORY_LIKE_COPY.count)).toHaveCount(0);

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText('누적 턴 수 1.2K')).toBeVisible();
  });

  test('카드가 없는 섹션은 숨기고 모든 섹션이 비면 빈 안내를 보여준다 (STORY-LIST-45)', async ({
    page,
  }) => {
    await mockHomeSections(page, [
      { name: '인기 스토리', items: [] },
      { name: '오리지널 스토리', items: [originalStory('o1', '마냑')] },
    ]);

    await page.goto('/');

    const main = page.getByRole('main');

    await expect(
      main.getByRole('heading', { name: '오리지널 스토리' }),
    ).toBeVisible();
    await expect(
      main.getByRole('heading', { name: '인기 스토리' }),
    ).toHaveCount(0);

    await mockHomeSections(page, [
      { name: '인기 스토리', items: [] },
      { name: '오리지널 스토리', items: [] },
    ]);
    await page.reload();

    await expect(page.getByText(STORY_LIST_COPY.empty)).toBeVisible();
    await expect(main.getByRole('heading', { level: 2 })).toHaveCount(0);
  });

  test('홈 목록 로드에 실패하면 다시 시도로 복구한다', async ({ page }) => {
    let callCount = 0;

    await page.route(isHomeStoriesUrl, async (route) => {
      callCount += 1;

      if (callCount === 1) {
        await route.fulfill({ status: 500, body: '{}' });

        return;
      }

      await route.fulfill({
        json: {
          sections: [
            {
              id: null,
              name: '인기 스토리',
              items: [originalStory('o1', '마냑의 첫 이야기')],
            },
          ],
        },
      });
    });

    await page.goto('/');

    await expect(page.getByText(STORY_LIST_ERROR_TITLE)).toBeVisible();

    await page.getByRole('button', { name: '다시 시도하기' }).click();

    await expect(
      page.getByText('마냑의 첫 이야기', { exact: true }),
    ).toBeVisible();
  });

  test('홈 목록 로딩 중에는 섹션 구조에 맞는 스켈레톤을 보여준다 (KNK-988)', async ({
    page,
  }) => {
    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });

    await page.route(isHomeStoriesUrl, async (route) => {
      await responseGate;
      await route.fulfill({ json: { sections: [] } });
    });

    await page.goto('/');

    const loading = page.getByRole('status', {
      name: STORY_LIST_COPY.loadingLabel,
    });

    await expect(loading).toBeVisible();
    // 섹션 2개마다 제목 1개와 카드 3장의 썸네일, 제목, 제작자다.
    await expect(loading.locator('[data-slot="skeleton"]')).toHaveCount(20);

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
    await page.goto('/');
    await page
      .getByRole('banner')
      .getByRole('link', { name: '로그인' })
      .click();

    await expect(page).toHaveURL(/\/login$/);
  });

  test('로그인 상태에서는 메인 헤더에 로그인 버튼이 없다', async ({ page }) => {
    await mockMemberSession(page);

    for (const pathname of [
      APP_PATH.MAIN.STORIES,
      APP_PATH.MAIN.CHATS,
      APP_PATH.MAIN.STUDIO,
      APP_PATH.MAIN.EXPLORE,
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
    await page
      .getByRole('link', { name: STORY_MODE_SELECT_COPY.simple.title })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
  });

  test('공백 없는 긴 제목·한 줄 소개와 긴 장르도 카드 폭 안에서 줄바꿈하거나 말줄임한다 (STORY-LIST-40)', async ({
    page,
  }) => {
    const longText = 'ㄹㄱㅇㅇㅇ222ㅇㅇ123213'.repeat(4);

    await mockMemberSession(page);
    await page.route('**/api/v1/users/me/stories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            ...story('s1', longText),
            oneLineIntro: longText,
            genres: [
              '아주 긴 직접 추가 장르 이름 서른 글자까지 들어감',
              '판타지',
            ],
          },
        ]),
      });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page.getByText(longText, { exact: true })).toHaveCount(2);
    expect(await findOverflowingTexts(page)).toEqual([]);
  });

  test('홈 카드의 공백 없는 긴 제목도 카드 폭 안에서 말줄임한다 (STORY-LIST-41)', async ({
    page,
  }) => {
    await mockHomeStories(page, [originalStory('o1', `제목${UNBROKEN_TEXT}`)]);

    await page.goto('/');

    await expect(page.getByText(`제목${UNBROKEN_TEXT}`)).toBeVisible();
    expect(await findOverflowingTexts(page)).toEqual([]);
  });

  test('로그인 상태에서 스토리를 삭제하면 목록에서 사라진다', async ({
    page,
  }) => {
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
