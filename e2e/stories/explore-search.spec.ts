import { APP_PATH } from '@/constants/app-path';
import {
  EXPLORE_SEARCH_COPY,
  RECENT_SEARCHES_STORAGE_KEY,
} from '@/features/stories/_shared/constants/explore-search';

import { expect, mockStorySearch, test } from '../fixtures/test';

const searchStory = (id: string, title: string) => ({
  id,
  title,
  oneLineIntro: '한 줄 소개입니다',
  genres: ['판타지'],
  isOriginal: false,
  thumbnailUrlSm: null,
  createdAt: '2026-06-01T00:00:00Z',
});

const tile = (title: string) => ({ name: `${title} 상세 보기` });

test.describe('탐색 검색', () => {
  test('탐색 헤더 검색 버튼으로 검색 화면을 열고 2자 이상만 검색하며 검색어를 주소와 최근 검색어에 남긴다 (STORY-SEARCH-01, STORY-SEARCH-02)', async ({
    page,
  }) => {
    const search = await mockStorySearch(page, [
      [searchStory('s1', '마법 왕국')],
    ]);

    await page.goto(APP_PATH.MAIN.EXPLORE);
    await page
      .getByRole('banner')
      .getByRole('link', { name: EXPLORE_SEARCH_COPY.label })
      .click();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.EXPLORE_SEARCH()}$`));

    const input = page.getByRole('searchbox', {
      name: EXPLORE_SEARCH_COPY.label,
    });

    await expect(input).toBeFocused();
    await expect(
      page.getByRole('navigation', { name: '하단 네비게이션' }),
    ).toHaveCount(0);

    await input.fill(' 마 ');
    await input.press('Enter');
    await expect(page.getByText(EXPLORE_SEARCH_COPY.tooShort)).toBeVisible();
    expect(search.requests).toEqual([]);

    await input.fill('  마법  ');
    await input.press('Enter');

    await expect(page).toHaveURL(APP_PATH.EXPLORE_SEARCH('마법'));
    await expect(page.getByRole('link', tile('마법 왕국'))).toBeVisible();
    expect(search.requests).toEqual([{ q: '마법', cursor: null }]);

    await page.reload();
    await expect(input).toHaveValue('마법');
    await expect(page.getByRole('link', tile('마법 왕국'))).toBeVisible();

    await page.getByRole('button', { name: EXPLORE_SEARCH_COPY.clear }).click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.EXPLORE_SEARCH()}$`));
    await expect(input).toHaveValue('');
    await expect(
      page.getByRole('heading', { name: EXPLORE_SEARCH_COPY.recentTitle }),
    ).toBeVisible();

    await page
      .getByRole('button', { name: EXPLORE_SEARCH_COPY.removeRecent('마법') })
      .click();
    await expect(
      page.getByRole('heading', { name: EXPLORE_SEARCH_COPY.recentTitle }),
    ).toHaveCount(0);
  });

  test('대표 장르와 최근 검색어를 누르면 그 이름으로 검색하고 최근 검색어를 모두 지울 수 있다 (STORY-SEARCH-03)', async ({
    page,
  }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, JSON.stringify(['왕국']));
    }, RECENT_SEARCHES_STORAGE_KEY);

    const search = await mockStorySearch(page, [
      [searchStory('s1', '마법 왕국')],
    ]);

    await page.goto(APP_PATH.EXPLORE_SEARCH());
    await expect(
      page.getByRole('heading', { name: EXPLORE_SEARCH_COPY.genreTitle }),
    ).toBeVisible();

    await page.getByRole('button', { name: '판타지', exact: true }).click();
    await expect(page).toHaveURL(APP_PATH.EXPLORE_SEARCH('판타지'));
    await expect(
      page.getByRole('searchbox', { name: EXPLORE_SEARCH_COPY.label }),
    ).toHaveValue('판타지');

    await page.getByRole('button', { name: EXPLORE_SEARCH_COPY.clear }).click();
    await page.getByRole('button', { name: '왕국', exact: true }).click();
    await expect(page).toHaveURL(APP_PATH.EXPLORE_SEARCH('왕국'));
    expect(search.requests.map(({ q }) => q)).toEqual(['판타지', '왕국']);

    await page.getByRole('button', { name: EXPLORE_SEARCH_COPY.clear }).click();
    await page
      .getByRole('button', { name: EXPLORE_SEARCH_COPY.clearRecent })
      .click();
    await expect(
      page.getByRole('heading', { name: EXPLORE_SEARCH_COPY.recentTitle }),
    ).toHaveCount(0);
  });

  test('빈 페이지에도 다음 커서가 있으면 이어 받고 끝까지 없으면 결과 없음을 보인다 (STORY-SEARCH-04)', async ({
    page,
  }) => {
    const search = await mockStorySearch(page, [
      [],
      [searchStory('s2', '다음 페이지 결과')],
    ]);

    await page.goto(APP_PATH.EXPLORE_SEARCH('마법'));

    await expect(
      page.getByRole('link', tile('다음 페이지 결과')),
    ).toBeVisible();
    expect(search.requests.map(({ cursor }) => cursor)).toEqual([null, 'c1']);
    await expect(page.getByText(EXPLORE_SEARCH_COPY.empty)).toHaveCount(0);
  });

  test('결과가 없으면 결과 없음을, 실패하면 다시 시도를 보인다 (STORY-SEARCH-04, STORY-SEARCH-05)', async ({
    page,
  }) => {
    await mockStorySearch(page, [[]]);
    await page.goto(APP_PATH.EXPLORE_SEARCH('없는 이야기'));
    await expect(page.getByText(EXPLORE_SEARCH_COPY.empty)).toBeVisible();

    let calls = 0;

    await page.route(
      (url) => url.pathname === '/api/v1/stories/search',
      async (route) => {
        calls += 1;

        if (calls === 1) {
          await route.fulfill({ status: 503, json: {} });

          return;
        }

        await route.fulfill({
          json: {
            items: [searchStory('s3', '다시 받은 결과')],
            nextCursor: null,
          },
        });
      },
    );

    await page.goto(APP_PATH.EXPLORE_SEARCH('마법'));
    await expect(page.getByText(EXPLORE_SEARCH_COPY.loadFailed)).toBeVisible();

    await page.getByRole('button', { name: '다시 시도하기' }).click();
    await expect(page.getByRole('link', tile('다시 받은 결과'))).toBeVisible();
  });
});
