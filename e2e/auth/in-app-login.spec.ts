import type { Page } from '@playwright/test';

import { getMeUrl } from '@/api/generated/endpoints/auth/auth';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { SOCIAL_LOGIN_PENDING_LABEL } from '@/features/auth/_shared/hooks/use-social-login';
import { POPUP_LOGIN_MESSAGE_TYPE } from '@/lib/auth/popup-login';

import { expect, skipOnboarding, test } from '../fixtures/test';

/** 공급자 인증만 목킹하고 앱의 팝업, 메시지 수신과 세션 재확인을 실행한다. */
async function mockGooglePopup(page: Page, coop = false) {
  const requests = { session: 0, member: 0, signIn: 0 };
  let authenticated = false;

  await page.route('**/api/auth/providers', (route) =>
    route.fulfill({
      json: { google: { id: 'google', name: 'Google', type: 'oidc' } },
    }),
  );
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'test-csrf' } }),
  );
  await page.route(/\/api\/auth\/signin\/google(?:\?.*)?$/, (route) => {
    requests.signIn++;

    const body = new URLSearchParams(route.request().postData() ?? '');
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');

    url.searchParams.set('callback', body.get('callbackUrl') ?? '');

    return route.fulfill({ json: { url: url.href } });
  });
  await page.route('**/api/auth/session', (route) => {
    requests.session++;

    return route.fulfill({
      json: authenticated
        ? { user: { id: 'user-1' }, expires: '2099-01-01T00:00:00.000Z' }
        : null,
    });
  });
  await page.route(`**${getMeUrl()}`, (route) => {
    requests.member++;

    return route.fulfill({ json: { id: 'user-1' } });
  });
  // 팝업의 첫 요청은 opener의 page.route로 가로챌 수 없어 context에 등록한다.
  await page.context().route('https://accounts.google.com/**', (route) => {
    const callback = new URL(route.request().url()).searchParams.get(
      'callback',
    );

    return route.fulfill({
      contentType: 'text/html; charset=utf-8',
      headers: coop ? { 'Cross-Origin-Opener-Policy': 'same-origin' } : {},
      body: `<meta charset="utf-8"><a href="${callback}">인증 완료</a>`,
    });
  });
  await page
    .context()
    .route(`**${APP_PATH.LOGIN_POPUP_COMPLETE}?*`, (route) => {
      authenticated = true;

      const message = JSON.stringify({
        type: POPUP_LOGIN_MESSAGE_TYPE,
        attempt: new URL(route.request().url()).searchParams.get('attempt'),
        authenticated: true,
      });

      // 창을 스스로 닫지 않아 정상 경로가 closed 폴링 없이 메시지로 완료되는지 확인한다.
      return route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `<meta charset="utf-8"><p>인증 완료</p><script>if(window.opener)window.opener.postMessage(${message},location.origin)</script>`,
      });
    });

  return requests;
}

// UA는 애플리케이션 분기만 선택한다. 실제 SNS 앱의 OAuth 허용을 증명하지 않는다.
for (const userAgent of [
  'Android Instagram',
  'iPhone Instagram',
  'Android KAKAOTALK',
  'iPhone KAKAOTALK',
  'Android Barcelona',
  'iPhone Barcelona',
]) {
  test.describe(`${userAgent} 로그인 진입`, () => {
    test.use({ userAgent });

    for (const path of [APP_PATH.MAIN.STORIES, APP_PATH.MAIN.MY]) {
      test(`${path}에서 로그인 화면을 열고 팝업 차단 시 재시도할 수 있다`, async ({
        page,
      }) => {
        await skipOnboarding(page);
        await page.addInitScript(() => {
          window.open = () => null;
        });

        const handoffRequests: string[] = [];

        page.on('request', (request) => {
          if (request.url().endsWith('/api/v1/auth/handoffs')) {
            handoffRequests.push(request.url());
          }
        });
        await page.goto(path);
        await page.getByRole('link', { name: '로그인', exact: true }).click();

        await expect(page).toHaveURL(APP_PATH.LOGIN);

        const google = page.getByRole('button', { name: /Google로 시작하기/ });
        const kakao = page.getByRole('button', { name: /카카오로 시작하기/ });

        await expect(kakao).toBeEnabled();

        for (let attempt = 0; attempt < 2; attempt++) {
          await google.click();
          await expect(
            page.getByText(TOAST_MESSAGE.LOGIN_FAILED).first(),
          ).toBeVisible();
          await expect(google).toBeEnabled();
          await expect(kakao).toBeEnabled();
          await expect(page).toHaveURL(APP_PATH.LOGIN);
        }

        expect(handoffRequests).toEqual([]);
      });
    }
  });
}

test.describe('인앱 소셜 로그인', () => {
  test.use({ userAgent: 'Android Instagram' });

  test('팝업 완료 메시지와 회원 세션을 확인한 뒤 원래 창의 callbackUrl로 돌아간다', async ({
    page,
    context,
  }) => {
    await skipOnboarding(page);

    const requests = await mockGooglePopup(page);
    const callbackUrl = `${APP_PATH.MAIN.STORIES}?login=complete#return`;
    const loginUrl = `${APP_PATH.LOGIN}?callbackUrl=${encodeURIComponent(callbackUrl)}`;

    await page.goto(loginUrl);

    const opened = context.waitForEvent('page');

    await page.getByRole('button', { name: /Google로 시작하기/ }).click();

    const popup = await opened;

    await expect(popup.getByRole('link', { name: '인증 완료' })).toBeVisible();
    await expect(page).toHaveURL(loginUrl);
    expect(requests.member).toBe(0);
    await popup.getByRole('link', { name: '인증 완료' }).click();

    await expect(page).toHaveURL(callbackUrl);
    expect(requests.member).toBeGreaterThan(0);
    await expect.poll(() => popup.isClosed()).toBe(true);
    await page.reload();

    const session = await page.evaluate(async () => {
      const response = await fetch('/api/auth/session');

      return response.json();
    });

    expect(session.user.id).toBe('user-1');
  });

  test('COOP가 창 참조를 끊어도 취소하지 않고 복귀 시 세션을 재확인한다', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      '현재 WebKit 환경은 공급자 목 응답의 COOP로 창 참조 단절이 재현되지 않는다.',
    );
    await skipOnboarding(page);
    await page.clock.install();
    await page.addInitScript(() => {
      const open = window.open.bind(window);

      window.open = (...args: Parameters<typeof window.open>) => {
        const popup = open(...args);

        Object.defineProperty(window, 'loginPopup', { value: popup });

        return popup;
      };
    });

    const requests = await mockGooglePopup(page, true);

    await page.goto(APP_PATH.LOGIN);

    const opened = context.waitForEvent('page');
    const google = page.getByRole('button', { name: /Google로 시작하기/ });

    await google.click();

    const popup = await opened;

    await expect(popup.getByRole('link', { name: '인증 완료' })).toBeVisible();
    expect(await popup.evaluate(() => window.opener)).toBeNull();
    expect(
      await page.evaluate(() => Reflect.get(window, 'loginPopup').closed),
    ).toBe(true);
    expect(popup.isClosed()).toBe(false);

    const before = requests.session;

    await page.bringToFront();
    await page.clock.runFor(1_000);
    await expect.poll(() => requests.session).toBeGreaterThan(before);
    await expect(
      page.getByRole('button', { name: SOCIAL_LOGIN_PENDING_LABEL }),
    ).toBeDisabled();
    await expect(page.getByText(TOAST_MESSAGE.LOGIN_FAILED)).toHaveCount(0);

    await popup.getByRole('link', { name: '인증 완료' }).click();
    await page.bringToFront();
    await page.clock.runFor(1_000);
    await expect(page).toHaveURL(APP_PATH.MAIN.STORIES);
    expect(requests.member).toBeGreaterThan(0);
    await popup.close();
  });

  test('5분 만료는 인증창을 닫지 않고 명시적 재시도부터 새 팝업을 사용한다', async ({
    page,
    context,
  }) => {
    await skipOnboarding(page);
    await page.clock.install();

    const requests = await mockGooglePopup(page);

    await page.goto(APP_PATH.LOGIN);

    const firstOpened = context.waitForEvent('page');
    const google = page.getByRole('button', { name: /Google로 시작하기/ });

    await google.click();

    const first = await firstOpened;

    await expect(first.getByRole('link', { name: '인증 완료' })).toBeVisible();

    await page.clock.fastForward(5 * 60 * 1_000);
    await expect(google).toBeEnabled();
    await expect(
      page.getByText(TOAST_MESSAGE.LOGIN_FAILED).first(),
    ).toBeVisible();
    expect(first.isClosed()).toBe(false);

    const retryOpened = context.waitForEvent('page');

    await google.click();

    const retry = await retryOpened;

    await expect.poll(() => first.isClosed()).toBe(true);
    await expect(retry.getByRole('link', { name: '인증 완료' })).toBeVisible();
    expect(requests.signIn).toBe(2);
    await retry.getByRole('link', { name: '인증 완료' }).click();
    await expect(page).toHaveURL(APP_PATH.MAIN.STORIES);
  });

  test('Kakao 로그인은 인앱의 같은 탭에서 기존 callbackUrl로 시작한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.route('**/api/auth/providers', (route) =>
      route.fulfill({
        json: { kakao: { id: 'kakao', name: 'Kakao', type: 'oidc' } },
      }),
    );
    await page.route('**/api/auth/csrf', (route) =>
      route.fulfill({
        json: { csrfToken: 'test-csrf' },
      }),
    );
    await page.route(/\/api\/auth\/signin\/kakao(?:\?.*)?$/, (route) =>
      route.fulfill({
        json: { url: page.url() },
      }),
    );

    const callbackUrl = '/stories/s1?setting=ss2#detail';

    await page.goto(
      `${APP_PATH.LOGIN}?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    );

    const signInRequest = page.waitForRequest(
      /\/api\/auth\/signin\/kakao(?:\?.*)?$/,
    );

    await page.getByRole('button', { name: /카카오로 시작하기/ }).click();

    const body = new URLSearchParams((await signInRequest).postData() ?? '');

    expect(body.get('callbackUrl')).toBe(callbackUrl);
    await expect(page).toHaveURL(
      `${APP_PATH.LOGIN}?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    );
  });
});
