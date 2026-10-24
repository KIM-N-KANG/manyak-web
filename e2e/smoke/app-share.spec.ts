import type { Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { APP_SHARE_COPY } from '@/features/app/constants';
import {
  APP_SHARE_PLAY_STORE_URL,
  APP_SHARE_REDIRECTED_KEY,
} from '@/lib/app-share';

import { expect, test } from '../fixtures/test';
import { USER_AGENT } from '../fixtures/user-agents';

/**
 * 현재 URL이 기대값이 될 때까지 기다린다. intent·카카오 스킴 이동은 Chromium이 중단(abort)해
 * `waitForURL`이 실패하므로 주소만 폴링한다.
 *
 * @param page 대상 페이지
 * @param expected 기대하는 URL 또는 경로
 */
async function waitForLocation(page: Page, expected: string): Promise<void> {
  await expect
    .poll(() => {
      const url = new URL(page.url());

      return expected.startsWith('/') ? url.pathname : url.href;
    })
    .toBe(expected);
}

test.describe('공유 링크 /app', () => {
  test.describe('데스크톱', () => {
    test.use({ userAgent: USER_AGENT.desktopChrome });

    test('웹 홈으로 교체 이동한다 (ONBD-APPLINK-01)', async ({ page }) => {
      await page.goto(APP_PATH.APP);
      await waitForLocation(page, APP_PATH.MAIN.STORIES);
    });
  });

  test('첫 HTML에 공유 미리보기 메타가 들어 있다 (ONBD-APPLINK-02)', async ({
    request,
  }) => {
    const response = await request.get(APP_PATH.APP, {
      headers: { 'User-Agent': 'kakaotalk-scrap/1.0' },
    });
    const html = await response.text();

    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:image"');
    expect(html).toMatch(/property="og:url" content="https:\/\/[^"]*\/app"/);
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  test.describe('Android 카카오톡 인앱', () => {
    test.use({ userAgent: USER_AGENT.androidKakao });

    test.beforeEach(({ browserName }) => {
      test.skip(
        browserName === 'webkit',
        'WebKit은 알 수 없는 스킴으로 이동하면 오류 화면으로 바뀐다',
      );
    });

    test('앱이 열리지 않으면 플레이스토어로 이동한다 (ONBD-APPLINK-03)', async ({
      page,
    }) => {
      await page.route(APP_SHARE_PLAY_STORE_URL, (route) =>
        route.fulfill({ body: 'play store' }),
      );
      await page.goto(APP_PATH.APP);
      await waitForLocation(page, APP_SHARE_PLAY_STORE_URL);
    });

    test('이미 이동한 탭에서는 머물며 받기 버튼을 보여준다 (ONBD-APPLINK-04)', async ({
      page,
    }) => {
      await page.addInitScript((key) => {
        window.sessionStorage.setItem(key, '1');
      }, APP_SHARE_REDIRECTED_KEY);
      await page.goto(APP_PATH.APP);

      await expect(
        page.getByRole('link', { name: APP_SHARE_COPY.action }),
      ).toHaveAttribute('href', APP_SHARE_PLAY_STORE_URL);
      await page.waitForTimeout(1000);
      expect(new URL(page.url()).pathname).toBe(APP_PATH.APP);
    });
  });
});
