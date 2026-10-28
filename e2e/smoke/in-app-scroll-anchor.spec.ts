import type { Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { APP_BANNER_SESSION_KEY } from '@/lib/app-banner';

import { expect, test } from '../fixtures/test';
import { USER_AGENT } from '../fixtures/user-agents';

/**
 * 문서 스크롤 위치를 읽는다.
 *
 * @param page 대상 페이지
 * @returns `window.scrollY`
 */
function documentScrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

test.describe('인앱 브라우저 문서 스크롤 고정', () => {
  test.describe('Threads 인앱', () => {
    test.use({ userAgent: USER_AGENT.iosThreads });

    test('문서 위치를 1px에 두고 0으로 내려가면 되돌린다', async ({ page }) => {
      await page.goto(APP_PATH.MAIN.STORIES);
      await expect.poll(() => documentScrollY(page)).toBe(1);

      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(() => documentScrollY(page)).toBe(1);
    });
  });

  test.describe('일반 브라우저', () => {
    test.use({ userAgent: USER_AGENT.androidChrome });

    test('문서 위치와 높이를 바꾸지 않는다', async ({ page }) => {
      await page.goto(APP_PATH.MAIN.STORIES);
      // 배너 판정은 하이드레이션 뒤에 기록되므로, 이 값이 생기면 고정 효과도 이미 돌았다.
      await expect
        .poll(() =>
          page.evaluate(
            (key) => window.sessionStorage.getItem(key),
            APP_BANNER_SESSION_KEY,
          ),
        )
        .not.toBeNull();

      expect(await documentScrollY(page)).toBe(0);
      expect(await page.evaluate(() => document.body.style.paddingBottom)).toBe(
        '',
      );
    });
  });
});
