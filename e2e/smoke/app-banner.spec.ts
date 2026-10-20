import type { Page } from '@playwright/test';

import { buildSnapStripIndicatorLabel } from '@/components/common/snap-strip';
import {
  APP_BANNER_COPY,
  APP_BANNER_VARIANT_COPY,
} from '@/constants/app-banner';
import { APP_SCREEN_ID } from '@/constants/app-frame';
import { APP_PATH } from '@/constants/app-path';
import {
  ANDROID_PLAY_STORE_URL,
  APP_BANNER_SESSION_KEY,
  APP_BANNER_VISITS_KEY,
  buildAppIntentUrl,
} from '@/lib/app-banner';

import { expect, skipOnboarding, test } from '../fixtures/test';
import { USER_AGENT } from '../fixtures/user-agents';

/**
 * 앱 안내 배너 영역을 찾는다.
 *
 * @param page 대상 페이지
 * @returns 배너 영역 로케이터
 */
function banner(page: Page) {
  return page.getByRole('region', { name: APP_BANNER_COPY.regionLabel });
}

/**
 * 배너 판정이 끝나 이번 탭의 접속 회차가 기록될 때까지 기다린다. 배너는 하이드레이션
 * 뒤에 판정하므로 숨김을 단언하기 전에 기다린다.
 *
 * @param page 대상 페이지
 * @param visit 기대하는 접속 회차
 */
async function waitForVisit(page: Page, visit: number): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        (key) => window.sessionStorage.getItem(key),
        APP_BANNER_SESSION_KEY,
      ),
    )
    .toBe(String(visit));
}

/**
 * 이번 탭의 세션 저장소를 비우고 새로고침해 새 탭 접속을 흉내 낸다.
 *
 * @param page 대상 페이지
 */
async function startNewVisit(page: Page): Promise<void> {
  await page.evaluate(() => window.sessionStorage.clear());
  await page.reload();
}

test.use({ appBanner: true });

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
});

test.describe('Android 브라우저', () => {
  test.use({ userAgent: USER_AGENT.androidChrome });

  test('첫 접속에 앱 열기 배너를 보여주고 홈에서는 앱 홈을 연다 (ONBD-BANNER-01, ONBD-BANNER-06)', async ({
    page,
  }) => {
    const copy = APP_BANNER_VARIANT_COPY.android_browser;

    await page.goto(APP_PATH.MAIN.STORIES);
    await waitForVisit(page, 1);

    await expect(banner(page).getByText(copy.message)).toBeVisible();
    await expect(
      banner(page).getByRole('link', { name: copy.actionLabel }),
    ).toHaveAttribute('href', buildAppIntentUrl(APP_PATH.MAIN.STORIES));
  });

  test('첫 번째와 세 번째 접속에만 보여준다 (ONBD-BANNER-02)', async ({
    page,
  }) => {
    await page.goto(APP_PATH.MAIN.STORIES);
    await waitForVisit(page, 1);
    await expect(banner(page)).toBeVisible();

    for (const [visit, isVisible] of [
      [2, false],
      [3, true],
      [4, false],
    ] as const) {
      await startNewVisit(page);
      await waitForVisit(page, visit);

      if (isVisible) {
        await expect(banner(page)).toBeVisible();
      } else {
        await expect(banner(page)).toBeHidden();
      }
    }
  });

  test('닫으면 같은 탭에서는 다시 보이지 않고 세 번째 접속에 다시 보인다 (ONBD-BANNER-11)', async ({
    page,
  }) => {
    await page.goto(APP_PATH.MAIN.STORIES);
    await waitForVisit(page, 1);

    await banner(page)
      .getByRole('button', { name: APP_BANNER_COPY.closeLabel })
      .click();
    await expect(banner(page)).toBeHidden();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(banner(page)).toBeHidden();

    await startNewVisit(page);
    await waitForVisit(page, 2);
    await startNewVisit(page);
    await waitForVisit(page, 3);
    await expect(banner(page)).toBeVisible();
  });

  test('키보드로 닫으면 배너 아래 화면으로 포커스를 옮긴다 (ONBD-BANNER-18)', async ({
    page,
  }) => {
    await page.goto(APP_PATH.MAIN.STORIES);
    await waitForVisit(page, 1);

    await banner(page)
      .getByRole('button', { name: APP_BANNER_COPY.closeLabel })
      .focus();
    await page.keyboard.press('Enter');

    await expect(banner(page)).toBeHidden();
    await expect(page.locator(`#${APP_SCREEN_ID}`)).toBeFocused();
  });

  test('문서 화면에는 띄우지 않고 접속으로 세지 않는다 (ONBD-BANNER-12)', async ({
    page,
  }) => {
    for (const path of [APP_PATH.TERMS, APP_PATH.PRIVACY, APP_PATH.ABOUT]) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(banner(page)).toBeHidden();
    }

    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key),
        APP_BANNER_VISITS_KEY,
      ),
    ).toBeNull();

    await page.goto(APP_PATH.MAIN.STORIES);
    await waitForVisit(page, 1);
    await expect(banner(page)).toBeVisible();
  });
});

test.describe('Android 인앱 브라우저', () => {
  test.use({ userAgent: USER_AGENT.androidKakao });

  test('매 접속 보여주고 스토리 상세에서는 그 스토리를 연다 (ONBD-BANNER-03, ONBD-BANNER-04)', async ({
    page,
  }) => {
    const copy = APP_BANNER_VARIANT_COPY.android_inapp;

    await page.goto(APP_PATH.STORY_DETAIL('s1'));
    await waitForVisit(page, 1);
    await expect(
      banner(page).getByRole('link', { name: copy.actionLabel }),
    ).toHaveAttribute('href', buildAppIntentUrl(APP_PATH.STORY_DETAIL('s1')));

    await startNewVisit(page);
    await waitForVisit(page, 2);
    await expect(banner(page)).toBeVisible();
  });
});

test.describe('Android 인앱 브라우저 앱 열기 실패', () => {
  test.use({ userAgent: USER_AGENT.androidKakao });

  test.beforeEach(({ browserName }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit은 알 수 없는 스킴으로 이동하면 오류 화면으로 바뀐다',
    );
  });

  test('앱이 열리지 않으면 0.7초 뒤 플레이스토어로 이동한다 (ONBD-BANNER-20)', async ({
    page,
  }) => {
    await page.route(ANDROID_PLAY_STORE_URL, (route) =>
      route.fulfill({ body: 'play store' }),
    );
    await page.goto(APP_PATH.MAIN.STORIES);
    await waitForVisit(page, 1);
    await banner(page)
      .getByRole('link', {
        name: APP_BANNER_VARIANT_COPY.android_inapp.actionLabel,
      })
      .click();

    await page.waitForURL(ANDROID_PLAY_STORE_URL);
  });

  test('앱으로 전환되면 플레이스토어로 이동하지 않는다 (ONBD-BANNER-20)', async ({
    page,
  }) => {
    await page.goto(APP_PATH.MAIN.STORIES);
    await waitForVisit(page, 1);
    await banner(page)
      .getByRole('link', {
        name: APP_BANNER_VARIANT_COPY.android_inapp.actionLabel,
      })
      .click();

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(2000);

    expect(page.url()).not.toContain('play.google.com');
  });
});

test.describe('iOS 인앱 브라우저', () => {
  test.use({ userAgent: USER_AGENT.iosKakao });

  test('외부 전환이 일어나지 않으면 1.5초 뒤 안내 시트를 연다 (ONBD-BANNER-08)', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit은 알 수 없는 스킴으로 이동하면 오류 화면으로 바뀐다',
    );

    const copy = APP_BANNER_VARIANT_COPY.ios_inapp;

    await page.goto(APP_PATH.MAIN.STORIES);
    await waitForVisit(page, 1);
    await expect(banner(page).getByText(copy.message)).toBeVisible();

    await banner(page).getByRole('button', { name: copy.actionLabel }).click();

    await expect(
      page.getByRole('dialog', { name: APP_BANNER_COPY.escapeGuide.title }),
    ).toBeVisible();
  });
});

test.describe('iOS 인앱 브라우저 전환 실패 판정', () => {
  test.use({ userAgent: USER_AGENT.iosKakao });

  test.beforeEach(({ browserName }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit은 알 수 없는 스킴으로 이동하면 오류 화면으로 바뀐다',
    );
  });

  test('열기를 여러 번 눌러도 실패 안내 이벤트는 한 번만 보낸다 (ONBD-BANNER-19)', async ({
    page,
  }) => {
    const events: string[] = [];

    page.on('console', (message) => {
      if (message.text().includes('client_appBanner_escapeGuide_shown')) {
        events.push(message.text());
      }
    });
    await page.goto(APP_PATH.MAIN.STORIES);
    await waitForVisit(page, 1);

    const action = banner(page).getByRole('button', {
      name: APP_BANNER_VARIANT_COPY.ios_inapp.actionLabel,
    });

    await action.click();
    await action.click();
    await action.click();
    await expect(
      page.getByRole('dialog', { name: APP_BANNER_COPY.escapeGuide.title }),
    ).toBeVisible();
    // 뒤에 만든 타이머가 있었다면 모두 끝났을 시간까지 기다린다.
    await page.waitForTimeout(2000);
    expect(events).toHaveLength(1);
  });

  test('외부로 전환됐다가 1.5초 안에 돌아와도 실패 안내를 띄우지 않는다 (ONBD-BANNER-19)', async ({
    page,
  }) => {
    await page.goto(APP_PATH.MAIN.STORIES);
    await waitForVisit(page, 1);
    await banner(page)
      .getByRole('button', {
        name: APP_BANNER_VARIANT_COPY.ios_inapp.actionLabel,
      })
      .click();

    await page.evaluate(() => {
      const setVisibility = (state: DocumentVisibilityState) => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => state,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      };

      setVisibility('hidden');
      setVisibility('visible');
    });
    await page.waitForTimeout(2000);

    await expect(
      page.getByRole('dialog', { name: APP_BANNER_COPY.escapeGuide.title }),
    ).toBeHidden();
  });
});

test.describe('알 수 없는 iOS 인앱 브라우저', () => {
  test.use({ userAgent: USER_AGENT.iosUnknownApp });

  test('앱 토큰이 없어도 외부 전환을 시도하고 실패하면 안내 시트를 연다 (ONBD-BANNER-08)', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit은 알 수 없는 스킴으로 이동하면 오류 화면으로 바뀐다',
    );

    const copy = APP_BANNER_VARIANT_COPY.ios_inapp;

    await page.goto(APP_PATH.MAIN.STORIES);
    await waitForVisit(page, 1);
    await banner(page).getByRole('button', { name: copy.actionLabel }).click();

    await expect(
      page.getByRole('dialog', { name: APP_BANNER_COPY.escapeGuide.title }),
    ).toBeVisible();
  });
});

test.describe('iOS 브라우저', () => {
  test.use({ userAgent: USER_AGENT.iosSafari });

  test('추가하기를 누르면 스크린샷 안내를 열고 뒤로가기로 닫는다 (ONBD-BANNER-09)', async ({
    page,
  }) => {
    const copy = APP_BANNER_VARIANT_COPY.ios_browser;

    await page.goto(APP_PATH.MAIN.STORIES);
    await waitForVisit(page, 1);
    await banner(page).getByRole('button', { name: copy.actionLabel }).click();

    const sheet = page.getByRole('dialog', {
      name: APP_BANNER_COPY.homeScreenGuide.title,
    });

    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole('img', {
        name: APP_BANNER_COPY.homeScreenGuide.imageSteps[0].alt,
      }),
    ).toBeVisible();
    await expect(
      sheet.getByText(APP_BANNER_COPY.homeScreenGuide.imageSteps[0].label),
    ).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: buildSnapStripIndicatorLabel(1) }),
    ).toBeVisible();
    // 가로로 넘기는 영역이 시트를 아래로 끌어 닫는 동작으로 이어지지 않아야 한다.
    await expect(sheet.locator('[data-base-ui-swipe-ignore]')).toHaveCount(1);

    await page.goBack();
    await expect(sheet).toBeHidden();
    expect(new URL(page.url()).pathname).toBe(APP_PATH.MAIN.STORIES);
  });
});

test.describe('iOS Chrome', () => {
  test.use({ userAgent: USER_AGENT.iosChrome });

  test('Safari 26이 아니면 텍스트 안내를 연다 (ONBD-BANNER-16)', async ({
    page,
  }) => {
    await page.goto(APP_PATH.MAIN.STORIES);
    await waitForVisit(page, 1);
    await banner(page)
      .getByRole('button', {
        name: APP_BANNER_VARIANT_COPY.ios_browser.actionLabel,
      })
      .click();

    const sheet = page.getByRole('dialog', {
      name: APP_BANNER_COPY.homeScreenGuide.title,
    });

    await expect(
      sheet.getByText(APP_BANNER_COPY.homeScreenGuide.textSteps[1]),
    ).toBeVisible();
    await expect(sheet.getByRole('img')).toHaveCount(0);
  });
});

test.describe('데스크톱', () => {
  test.use({ userAgent: USER_AGENT.desktopChrome });

  test('데스크톱 브라우저에는 띄우지 않는다 (ONBD-BANNER-12)', async ({
    page,
  }) => {
    await page.goto(APP_PATH.MAIN.STORIES);
    await page.waitForLoadState('networkidle');
    await expect(banner(page)).toBeHidden();
  });
});
