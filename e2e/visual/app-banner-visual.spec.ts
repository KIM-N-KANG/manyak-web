import type { Page } from '@playwright/test';

import {
  APP_BANNER_COPY,
  APP_BANNER_VARIANT_COPY,
} from '@/constants/app-banner';
import { APP_PATH } from '@/constants/app-path';

import { expect, test } from '../fixtures/test';
import { USER_AGENT } from '../fixtures/user-agents';
import { waitForAnimations, waitForFonts } from '../fixtures/visual';

/**
 * 앱 안내 배너와 안내 시트의 정적 상태를 비교하는 비주얼 회귀 스펙. 노출 조건과
 * 동작은 `smoke/app-banner.spec.ts`가 담당한다.
 */

test.use({ appBanner: true });

/**
 * 홈을 열고 배너가 다 나타난 정적 상태가 될 때까지 기다린다.
 *
 * @param page 대상 페이지
 * @returns 배너 영역 로케이터
 */
async function openHomeWithBanner(page: Page) {
  await page.goto(APP_PATH.MAIN.STORIES);

  const region = page.getByRole('region', {
    name: APP_BANNER_COPY.regionLabel,
  });

  await expect(region).toBeVisible();
  await waitForFonts(page);
  await waitForAnimations(page);

  return region;
}

for (const { name, userAgent } of [
  { name: 'android-browser', userAgent: USER_AGENT.androidChrome },
  { name: 'android-inapp', userAgent: USER_AGENT.androidKakao },
  { name: 'ios-inapp', userAgent: USER_AGENT.iosKakao },
  { name: 'ios-browser', userAgent: USER_AGENT.iosSafari },
]) {
  test.describe(`앱 안내 배너 ${name}`, () => {
    test.use({ userAgent });

    test('배너 (ONBD-BANNER)', async ({ page }) => {
      const region = await openHomeWithBanner(page);

      await expect(region).toHaveScreenshot(`app-banner-${name}.png`);
    });
  });
}

test.describe('홈 화면 추가 안내', () => {
  test.use({ userAgent: USER_AGENT.iosSafari });

  test('안내 시트 (ONBD-BANNER-09)', async ({ page }) => {
    const region = await openHomeWithBanner(page);

    await region
      .getByRole('button', {
        name: APP_BANNER_VARIANT_COPY.ios_browser.actionLabel,
      })
      .click();

    const sheet = page.getByRole('dialog', {
      name: APP_BANNER_COPY.homeScreenGuide.title,
    });

    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('img').first()).toHaveJSProperty(
      'complete',
      true,
    );
    await waitForAnimations(page);
    await expect(sheet).toHaveScreenshot('app-banner-home-screen-guide.png');
  });
});

test.describe('외부 브라우저 안내', () => {
  test.use({ userAgent: USER_AGENT.iosKakao });

  test('안내 시트 (ONBD-BANNER-08)', async ({ page }) => {
    const region = await openHomeWithBanner(page);

    await region
      .getByRole('button', {
        name: APP_BANNER_VARIANT_COPY.ios_inapp.actionLabel,
      })
      .click();

    const sheet = page.getByRole('dialog', {
      name: APP_BANNER_COPY.escapeGuide.title,
    });

    await expect(sheet).toBeVisible();
    await waitForAnimations(page);
    await expect(sheet).toHaveScreenshot('app-banner-escape-guide.png');
  });
});
