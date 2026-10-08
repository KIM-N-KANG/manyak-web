import { type Page } from '@playwright/test';

import type { UserConsentResponse } from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { CONSENT_SHEET_COPY } from '@/features/auth/_shared/constants/consent';
import { PENDING_LOGIN_STORAGE_KEY } from '@/features/auth/_shared/utils/pending-login-storage';
import { PUSH_CONSENT_NOTICE_COPY } from '@/features/my/_shared/constants/push-copy';
import type { SignupConsentSummary } from '@/lib/auth/signup-consent';

import {
  CONSENTS_FIXTURE,
  expect,
  mockMemberSession,
  mockSignupConsent,
  mockSignupConsentSignIn,
  PUSH_SETTINGS_FIXTURE,
  seedPendingLogin,
  seedStoryIds,
  skipOnboarding,
  test,
} from '../fixtures/test';

/**
 * 로그인 직후 필수 동의 게이트 스펙(FE-SCREEN-010 동의 모델, 웹 사용자 모델, QA AUTH-CONSENT).
 * 동의 조회(GET /users/me/consents)가 정본이고, 필요 항목이 남으면 전역 모달 시트가 회원
 * 기능·부수 효과를 막는다. OAuth는 외부 의존이라 회원 세션 목과 탭 로그인 표시로 대신한다.
 */
const CONSENTS = '**/api/v1/users/me/consents';
const MY_STORIES = '**/api/v1/users/me/stories*';
const MIGRATE = '**/api/v1/auth/migrate';
const STORY_DETAIL = '**/api/v1/stories/s1';
const CREATE_CHAT = '**/api/v1/chats';

/** 세 항목 모두 현행 버전 동의가 필요한 상태. */
const PENDING_CONSENTS: UserConsentResponse = {
  terms: { requiredVersion: 'v1.2', needsConsent: true },
  privacy: { requiredVersion: 'v1.4', needsConsent: true },
  age14: { requiredVersion: '1', needsConsent: true },
};

const consentDialog = (page: Page) =>
  page.getByRole('dialog', { name: CONSENT_SHEET_COPY.title });

const submitButton = (page: Page) =>
  consentDialog(page).getByRole('button', { name: CONSENT_SHEET_COPY.submit });

const logoutButton = (page: Page) =>
  consentDialog(page).getByRole('button', { name: CONSENT_SHEET_COPY.logout });

/** 동의하지 않고 시트를 떠나는 두 경로. 둘 다 같은 결과여야 한다. */
const LEAVE_SHEET = [
  ['뒤로가기를 누르면', (page: Page) => page.goBack()],
  ['로그아웃 버튼을 누르면', (page: Page) => logoutButton(page).click()],
] as const;

/**
 * next-auth signOut 파이프라인(csrf → signout)을 목킹하고, 로그아웃 뒤에는 세션 조회가
 * 게스트(null)를 응답하게 한다. 회원 세션 목보다 나중에 등록해야 우선한다.
 *
 * @param page 대상 페이지
 * @returns signout 요청 수를 읽는 객체
 */
const mockSignOut = async (page: Page) => {
  const state = { count: 0 };

  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'test-csrf' } }),
  );
  await page.route('**/api/auth/signout', (route) => {
    state.count += 1;

    const body = new URLSearchParams(route.request().postData() ?? '');

    return route.fulfill({ json: { url: body.get('callbackUrl') ?? '/' } });
  });
  await page.route('**/api/auth/session', (route) =>
    state.count > 0 ? route.fulfill({ json: null }) : route.fallback(),
  );

  return state;
};

test.describe('로그인 직후 필수 동의 게이트', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('이미 필수 동의를 마친 회원은 시트 없이 바로 회원 기능을 쓴다', async ({
    page,
  }) => {
    await mockMemberSession(page);

    const myStories = page.waitForRequest(MY_STORIES);

    await page.goto(APP_PATH.MAIN.STUDIO);

    await myStories;
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByRole('banner').getByRole('link', { name: '로그인' }),
    ).toHaveCount(0);
  });

  test('동의 조회가 끝나기 전에는 회원 조회·게스트 이관·초대 온보딩을 시작하지 않고, 끝난 뒤에 순서대로 시작한다', async ({
    page,
  }) => {
    let releaseConsents!: () => void;
    const consentsReady = new Promise<void>((resolve) => {
      releaseConsents = resolve;
    });
    let myStoriesCount = 0;
    let migrateCount = 0;

    await mockMemberSession(page, { inviteOnboardingPending: true });
    await seedStoryIds(page, ['11111111-1111-4111-8111-111111111111']);
    await page.route(CONSENTS, async (route) => {
      await consentsReady;
      await route.fulfill({ json: CONSENTS_FIXTURE });
    });
    await page.route(MY_STORIES, async (route) => {
      myStoriesCount += 1;
      await route.fulfill({ json: [] });
    });
    await page.route(MIGRATE, async (route) => {
      migrateCount += 1;
      await route.fulfill({
        json: { stories: [], chats: [], migrationClosed: false },
      });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);

    // 세션은 회원으로 확정됐지만 동의 응답 전이라 아무 회원 부수 효과도 시작하지 않는다.
    await expect(
      page.getByRole('banner').getByRole('link', { name: '로그인' }),
    ).toHaveCount(0);
    await page.waitForTimeout(1000);
    expect(myStoriesCount).toBe(0);
    expect(migrateCount).toBe(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    releaseConsents();

    await expect.poll(() => migrateCount).toBe(1);
    await expect.poll(() => myStoriesCount).toBeGreaterThan(0);
    await expect(page.getByRole('dialog')).toContainText(
      '지금은 건너뛰고 나중에 등록해도 돼요',
    );
  });

  test('필수 동의가 남아 있으면 강제 시트를 띄우고 배경 탭·Escape로 닫히지 않으며 초점은 시트 자체에 둔다', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await seedPendingLogin(page);
    await page.route(CONSENTS, (route) =>
      route.fulfill({ json: PENDING_CONSENTS }),
    );

    await page.goto(APP_PATH.MAIN.STUDIO);

    const dialog = consentDialog(page);

    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('checkbox', { name: CONSENT_SHEET_COPY.agreeAll }),
    ).toBeVisible();

    for (const label of Object.values(CONSENT_SHEET_COPY.items)) {
      await expect(dialog.getByRole('checkbox', { name: label })).toBeVisible();
    }

    await expect(submitButton(page)).toBeDisabled();
    // 동의하지 않는 출구는 제출 아래의 로그아웃 버튼이다.
    await expect(logoutButton(page)).toBeEnabled();
    await expect(
      dialog.locator('[data-slot="drawer-swipe-handle"]'),
    ).toHaveCount(0);

    // 초기 초점은 특정 체크박스가 아니라 시트 자체에 있다.
    expect(
      await page.evaluate(() => ({
        role: document.activeElement?.getAttribute('role'),
        inDialog: Boolean(document.activeElement?.closest('[role="dialog"]')),
      })),
    ).toEqual({ role: 'dialog', inDialog: true });

    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(dialog).toBeVisible();

    // 필수 항목을 모두 체크해야 제출할 수 있다.
    await dialog
      .getByRole('checkbox', { name: CONSENT_SHEET_COPY.items.terms })
      .click();
    await expect(submitButton(page)).toBeDisabled();
    await dialog
      .getByRole('checkbox', { name: CONSENT_SHEET_COPY.agreeAll })
      .click();
    await expect(submitButton(page)).toBeEnabled();
  });

  test('기록 요청에는 조회에서 필요한 항목의 버전만 싣고, 성공하면 같은 URL에서 회원 기능이 열린다', async ({
    page,
  }) => {
    const recordBodies: unknown[] = [];
    let createChatCount = 0;

    await mockMemberSession(page);
    await seedPendingLogin(page);
    await page.route(CONSENTS, async (route) => {
      if (route.request().method() === 'POST') {
        recordBodies.push(route.request().postDataJSON());
        await route.fulfill({ json: CONSENTS_FIXTURE });

        return;
      }

      await route.fulfill({
        json: {
          terms: { requiredVersion: 'v1.3', needsConsent: true },
          privacy: { requiredVersion: 'v1.4', needsConsent: false },
          age14: { requiredVersion: '1', needsConsent: true },
        },
      });
    });
    await page.route(STORY_DETAIL, (route) =>
      route.fulfill({
        json: {
          id: 's1',
          title: '용의 계곡',
          oneLineIntro: '한 줄 소개입니다',
          genres: ['판타지'],
          createdAt: '2026-06-01T00:00:00Z',
          startSettings: [],
        },
      }),
    );
    await page.route(CREATE_CHAT, async (route) => {
      createChatCount += 1;
      await route.fulfill({ status: 201, json: { id: 'c1', storyId: 's1' } });
    });

    await page.goto('/stories/s1?setting=ss2#endings');

    const dialog = consentDialog(page);

    await expect(dialog).toBeVisible();
    // 이미 동의한 개인정보 처리방침은 항목에 없다.
    await expect(
      dialog.getByRole('checkbox', { name: CONSENT_SHEET_COPY.items.privacy }),
    ).toHaveCount(0);

    await dialog
      .getByRole('checkbox', { name: CONSENT_SHEET_COPY.agreeAll })
      .click();
    await submitButton(page).click();

    await expect(dialog).toBeHidden();
    expect(recordBodies).toEqual([{ age14: '1', terms: 'v1.3' }]);
    await expect(page).toHaveURL('/stories/s1?setting=ss2#endings');

    // 전체 동의는 광고 동의도 켜므로 처리 결과 다이얼로그가 따라온다. 닫아야 화면을 쓸 수 있다.
    const notice = page.getByRole('alertdialog');

    await expect(notice).toContainText(PUSH_CONSENT_NOTICE_COPY.title);
    await notice
      .getByRole('button', { name: PUSH_CONSENT_NOTICE_COPY.close })
      .click();
    await expect(notice).toBeHidden();

    // 동의를 마친 뒤에야 회원 기능(채팅 시작)이 실제 요청으로 이어진다. 자동 재실행은 없다.
    expect(createChatCount).toBe(0);
    await page.getByRole('button', { name: '새 채팅 시작하기' }).click();
    await expect(page).toHaveURL(/\/chats\/c1$/);
    expect(createChatCount).toBe(1);
  });

  test('동의를 마치지 않은 탭을 닫고 다시 접속하면 로그인이 유지되지 않는다', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await page.route(CONSENTS, (route) =>
      route.fulfill({ json: PENDING_CONSENTS }),
    );

    const signOut = await mockSignOut(page);

    // 이 탭에는 로그인 진행 표시가 없다(이전 탭에서 동의 없이 끝난 로그인).
    await page.goto(APP_PATH.MAIN.STUDIO);
    await page.evaluate(() => {
      (window as { keepAlive?: boolean }).keepAlive = true;
    });

    await expect.poll(() => signOut.count).toBe(1);
    await expect(
      page.getByRole('banner').getByRole('link', { name: '로그인' }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // 페이지를 다시 불러오지 않고 그 자리에서 게스트로 바뀐다(깜빡임 없음).
    expect(
      await page.evaluate(() => (window as { keepAlive?: boolean }).keepAlive),
    ).toBe(true);
  });

  for (const [action, leave] of LEAVE_SHEET) {
    test(`동의 시트가 열린 채 ${action} 동의하지 않은 것으로 보고 새로고침 없이 로그아웃한다`, async ({
      page,
    }) => {
      await mockMemberSession(page);
      await seedPendingLogin(page);
      await page.route(CONSENTS, (route) =>
        route.fulfill({ json: PENDING_CONSENTS }),
      );

      const signOut = await mockSignOut(page);

      await page.goto(APP_PATH.MAIN.STUDIO);
      await expect(consentDialog(page)).toBeVisible();
      await page.evaluate(() => {
        (window as { keepAlive?: boolean }).keepAlive = true;
      });

      await leave(page);

      await expect.poll(() => signOut.count).toBe(1);
      await expect(consentDialog(page)).toBeHidden();
      await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
      await expect(
        page.getByRole('banner').getByRole('link', { name: '로그인' }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => (window as { keepAlive?: boolean }).keepAlive,
        ),
      ).toBe(true);
    });
  }

  test('버전 불일치면 자동 재전송 없이 최신 버전을 다시 표시하고 체크를 초기화한다', async ({
    page,
  }) => {
    const recordBodies: Record<string, string>[] = [];
    let currentTermsVersion = 'v1.2';

    await mockMemberSession(page);
    await seedPendingLogin(page);
    await page.route(CONSENTS, async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as Record<string, string>;

        recordBodies.push(body);

        if (body.terms !== currentTermsVersion) {
          await route.fulfill({
            status: 400,
            json: { code: 'CONSENT_VERSION_MISMATCH' },
          });

          return;
        }

        await route.fulfill({ json: CONSENTS_FIXTURE });

        return;
      }

      await route.fulfill({
        json: {
          ...CONSENTS_FIXTURE,
          terms: { requiredVersion: currentTermsVersion, needsConsent: true },
        },
      });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);

    const dialog = consentDialog(page);
    const termsCheckbox = dialog.getByRole('checkbox', {
      name: CONSENT_SHEET_COPY.items.terms,
    });

    await termsCheckbox.click();
    // 제출 직전에 서버 요구 버전이 바뀐 상황을 재현한다.
    currentTermsVersion = 'v1.3';
    await submitButton(page).click();

    await expect(
      dialog.getByText(CONSENT_SHEET_COPY.error.versionMismatch),
    ).toBeVisible();
    await expect(termsCheckbox).toHaveAttribute('aria-checked', 'false');
    await expect(submitButton(page)).toBeDisabled();
    expect(recordBodies).toEqual([{ terms: 'v1.2' }]);

    await termsCheckbox.click();
    await submitButton(page).click();

    await expect(dialog).toBeHidden();
    expect(recordBodies).toEqual([{ terms: 'v1.2' }, { terms: 'v1.3' }]);
  });

  test('동의 시트에서 약관 문서를 새 탭으로 열어도 원래 탭은 로그아웃되지 않는다', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await seedPendingLogin(page);
    await page.route(CONSENTS, (route) =>
      route.fulfill({ json: PENDING_CONSENTS }),
    );

    const signOut = await mockSignOut(page);

    await page.goto(APP_PATH.MAIN.STUDIO);

    const dialog = consentDialog(page);

    await expect(dialog).toBeVisible();

    const popupPromise = page.waitForEvent('popup');

    await dialog
      .getByRole('link', { name: CONSENT_SHEET_COPY.viewDocument.terms })
      .click();

    const termsPage = await popupPromise;

    await expect(termsPage).toHaveURL(APP_PATH.TERMS);
    await expect(
      termsPage.getByRole('heading', { level: 1, name: '서비스 이용약관' }),
    ).toBeVisible();
    // 공개 법적 문서 탭은 동의 시트도, fail-closed 로그아웃도 띄우지 않는다.
    await expect(termsPage.getByRole('dialog')).toHaveCount(0);
    await termsPage.waitForTimeout(500);
    expect(signOut.count).toBe(0);

    await termsPage.close();
    await expect(dialog).toBeVisible();
    expect(signOut.count).toBe(0);
  });

  test('동의 조회가 403이면 회원 기능을 열지 않고 안내와 로그아웃만 제공한다', async ({
    page,
  }) => {
    let myStoriesCount = 0;

    await mockMemberSession(page);
    await seedPendingLogin(page);
    await page.route(CONSENTS, (route) =>
      route.fulfill({ status: 403, json: { code: 'USER_SUSPENDED' } }),
    );
    await page.route(MY_STORIES, async (route) => {
      myStoriesCount += 1;
      await route.fulfill({ json: [] });
    });

    const signOut = await mockSignOut(page);

    await page.goto(APP_PATH.MAIN.STUDIO);

    const dialog = page.getByRole('dialog', {
      name: CONSENT_SHEET_COPY.forbidden.title,
    });

    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: CONSENT_SHEET_COPY.submit }),
    ).toHaveCount(0);
    expect(myStoriesCount).toBe(0);

    // 막힌 계정의 유일한 출구는 로그아웃이며, 새로고침 없이 같은 화면이 게스트로 바뀐다.
    await page.evaluate(() => {
      (window as { keepAlive?: boolean }).keepAlive = true;
    });
    await dialog
      .getByRole('button', { name: CONSENT_SHEET_COPY.logout })
      .click();

    await expect.poll(() => signOut.count).toBe(1);
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(
      page.getByRole('banner').getByRole('link', { name: '로그인' }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => (window as { keepAlive?: boolean }).keepAlive),
    ).toBe(true);
  });

  test('동의 조회가 일시 실패하면 재시도로 복구한다', async ({ page }) => {
    let consentsCount = 0;

    await mockMemberSession(page);
    await seedPendingLogin(page);
    await page.route(CONSENTS, async (route) => {
      consentsCount += 1;

      if (consentsCount === 1) {
        await route.fulfill({ status: 503, json: { error: 'unavailable' } });

        return;
      }

      await route.fulfill({ json: CONSENTS_FIXTURE });
    });

    const myStories = page.waitForRequest(MY_STORIES);

    await page.goto(APP_PATH.MAIN.STUDIO);

    const dialog = page.getByRole('dialog', {
      name: CONSENT_SHEET_COPY.loadError.title,
    });

    await expect(dialog).toBeVisible();
    // 재시도 외에 동의하지 않고 떠날 출구도 둔다.
    await expect(
      dialog.getByRole('button', { name: CONSENT_SHEET_COPY.logout }),
    ).toBeEnabled();
    await dialog
      .getByRole('button', { name: CONSENT_SHEET_COPY.retry })
      .click();

    await expect(dialog).toBeHidden();
    await myStories;
    expect(consentsCount).toBe(2);
  });
});

test.describe('필수 동의 시트의 광고성 알림 수신 동의(선택)', () => {
  test('체크하지 않아도 제출할 수 있고 광고 동의는 저장하지 않는다', async ({
    page,
  }) => {
    let pushSettingsPutCount = 0;

    await mockMemberSession(page);
    await seedPendingLogin(page);
    await page.route(CONSENTS, async (route) => {
      await route.fulfill({
        json:
          route.request().method() === 'POST'
            ? CONSENTS_FIXTURE
            : PENDING_CONSENTS,
      });
    });
    await page.route('**/api/v1/users/me/push-settings', async (route) => {
      if (route.request().method() === 'PUT') {
        pushSettingsPutCount += 1;
      }

      await route.fulfill({ json: PUSH_SETTINGS_FIXTURE });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);

    const dialog = consentDialog(page);
    const marketing = dialog.getByRole('checkbox', {
      name: CONSENT_SHEET_COPY.marketing,
    });

    await expect(marketing).toBeVisible();
    await expect(marketing).not.toBeChecked();
    // 전체 동의는 선택 항목까지 켜지만, 선택만 다시 끄면 전체 동의가 풀리고 제출은 가능하다.
    await dialog
      .getByRole('checkbox', { name: CONSENT_SHEET_COPY.agreeAll })
      .click();
    await expect(marketing).toBeChecked();
    await marketing.click();
    await expect(marketing).not.toBeChecked();
    await expect(
      dialog.getByRole('checkbox', { name: CONSENT_SHEET_COPY.agreeAll }),
    ).not.toBeChecked();
    await expect(submitButton(page)).toBeEnabled();
    await submitButton(page).click();

    await expect(dialog).toBeHidden();
    await page.waitForTimeout(500);
    expect(pushSettingsPutCount).toBe(0);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });

  test('체크한 채 동의하면 필수 동의 저장 뒤 광고만 켠 전체 교체 PUT과 처리 결과 통지가 이어진다', async ({
    page,
  }) => {
    const putBodies: unknown[] = [];

    await mockMemberSession(page);
    await seedPendingLogin(page);
    await page.route(CONSENTS, async (route) => {
      await route.fulfill({
        json:
          route.request().method() === 'POST'
            ? CONSENTS_FIXTURE
            : PENDING_CONSENTS,
      });
    });
    await page.route('**/api/v1/users/me/push-settings', async (route) => {
      if (route.request().method() === 'PUT') {
        putBodies.push(route.request().postDataJSON());
        await route.fulfill({ body: route.request().postData() ?? '{}' });

        return;
      }

      await route.fulfill({ json: PUSH_SETTINGS_FIXTURE });
    });

    await page.goto(APP_PATH.MAIN.STUDIO);

    const dialog = consentDialog(page);

    await dialog
      .getByRole('checkbox', { name: CONSENT_SHEET_COPY.agreeAll })
      .click();
    await expect(
      dialog.getByRole('checkbox', { name: CONSENT_SHEET_COPY.marketing }),
    ).toBeChecked();
    await submitButton(page).click();

    await expect(dialog).toBeHidden();
    await expect.poll(() => putBodies.length).toBe(1);
    expect(putBodies[0]).toEqual({
      servicePush: true,
      marketingPush: true,
      marketingNightPush: false,
    });

    const notice = page.getByRole('alertdialog');

    await expect(notice).toContainText(PUSH_CONSENT_NOTICE_COPY.title);
    await expect(notice).toContainText(
      PUSH_CONSENT_NOTICE_COPY.result.marketingOn,
    );
  });
});

/** 세 항목 모두 동의가 필요한, 세션 없는 가입 대기. */
const SIGNUP_PENDING: SignupConsentSummary = {
  consents: PENDING_CONSENTS,
  expiresAt: '2099-01-01T00:00:00.000Z',
};

const readPendingLogin = (page: Page) =>
  page.evaluate(
    (key) => sessionStorage.getItem(key),
    PENDING_LOGIN_STORAGE_KEY,
  );

/**
 * 가입 동의 시트(FE-SCREEN-010, 웹 사용자 모델 로그인과 회원 이관, QA AUTH-CONSENT).
 * 필수 동의가 남은 소셜 인증은 세션 없이 대기 쿠키만 남기고, 동의 제출이 Credentials로
 * 가입을 완료해야 세션이 생긴다. OAuth 복귀는 탭 표시와 BFF 대기 조회 목으로 대신한다.
 */
test.describe('동의 전 가입 대기(세션 없음)', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('가입 동의를 마쳐야 세션이 생기고, 그 뒤에 회원 기능이 시작된다', async ({
    page,
  }) => {
    await seedPendingLogin(page);
    await mockSignupConsent(page, SIGNUP_PENDING);

    const signIn = await mockSignupConsentSignIn(page);
    let memberRequests = 0;
    let consentRecords = 0;

    await page.route(MY_STORIES, (route) => {
      memberRequests += 1;

      return route.fallback();
    });
    await page.route(CONSENTS, (route) => {
      if (route.request().method() === 'POST') {
        consentRecords += 1;
      }

      return route.fallback();
    });

    await page.goto(APP_PATH.MAIN.STUDIO);

    const dialog = consentDialog(page);

    await expect(dialog).toBeVisible();
    expect(memberRequests).toBe(0);

    const myStories = page.waitForRequest(MY_STORIES);

    await dialog
      .getByRole('checkbox', { name: CONSENT_SHEET_COPY.agreeAll })
      .check();
    await submitButton(page).click();

    await myStories;
    await expect(dialog).toBeHidden();
    expect(signIn.bodies).toHaveLength(1);
    expect(signIn.bodies[0].get('terms')).toBe('v1.2');
    expect(signIn.bodies[0].get('privacy')).toBe('v1.4');
    expect(signIn.bodies[0].get('age14')).toBe('1');
    // 가입 완료가 동의를 함께 저장하므로 회원 동의 기록 API는 부르지 않는다.
    expect(consentRecords).toBe(0);
    await expect.poll(() => readPendingLogin(page)).toBeNull();
  });

  for (const [code, toast] of [
    ['expired', TOAST_MESSAGE.SIGNUP_CONSENT_EXPIRED],
    ['outdated', TOAST_MESSAGE.SIGNUP_CONSENT_OUTDATED],
  ] as const) {
    test(`완료가 ${code}로 거절되면 시트를 닫고 다시 로그인을 안내한다`, async ({
      page,
    }) => {
      await seedPendingLogin(page);
      await mockSignupConsent(page, SIGNUP_PENDING);

      const signIn = await mockSignupConsentSignIn(page, { error: code });

      await page.goto(APP_PATH.MAIN.STUDIO);

      const dialog = consentDialog(page);

      await dialog
        .getByRole('checkbox', { name: CONSENT_SHEET_COPY.agreeAll })
        .check();
      await submitButton(page).click();

      await expect(page.getByText(toast)).toBeVisible();
      await expect(dialog).toBeHidden();
      expect(signIn.bodies).toHaveLength(1);
      await expect.poll(() => readPendingLogin(page)).toBeNull();
      await expect(
        page.getByRole('banner').getByRole('link', { name: '로그인' }),
      ).toBeVisible();
    });
  }

  test('일시 실패면 시트와 체크를 유지하고 같은 대기로 다시 제출할 수 있다', async ({
    page,
  }) => {
    await seedPendingLogin(page);
    await mockSignupConsent(page, SIGNUP_PENDING);

    const signIn = await mockSignupConsentSignIn(page, { error: 'retryable' });

    await page.goto(APP_PATH.MAIN.STUDIO);

    const dialog = consentDialog(page);

    await dialog
      .getByRole('checkbox', { name: CONSENT_SHEET_COPY.agreeAll })
      .check();
    await submitButton(page).click();

    await expect(dialog.getByRole('alert')).toHaveText(
      CONSENT_SHEET_COPY.error.retryable,
    );
    await expect(dialog).toBeVisible();
    await expect(submitButton(page)).toBeEnabled();
    await submitButton(page).click();
    await expect.poll(() => signIn.bodies.length).toBe(2);
  });

  for (const [action, leave] of LEAVE_SHEET) {
    test(`시트가 열린 채 ${action} 가입을 취소하고 로그아웃 없이 게스트로 남는다`, async ({
      page,
    }) => {
      await seedPendingLogin(page);

      const signupConsent = await mockSignupConsent(page, SIGNUP_PENDING);
      const signOut = await mockSignOut(page);

      await page.goto(APP_PATH.MAIN.STUDIO);
      await expect(consentDialog(page)).toBeVisible();

      await leave(page);

      await expect(consentDialog(page)).toBeHidden();
      await expect.poll(() => signupConsent.delete).toBe(1);
      expect(signOut.count).toBe(0);
      await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
      await expect.poll(() => readPendingLogin(page)).toBeNull();
    });
  }

  test('시트를 마치지 않고 떠났다가 뒤로가기로 돌아오면 가입을 취소하고 시트를 다시 띄우지 않는다', async ({
    page,
  }) => {
    // Chrome은 사용자 조작 없이 시트를 연 화면을 뒤로가기 버튼에서 건너뛰어 OAuth 화면으로 보낸다.
    // 그 화면에서 다시 돌아오는 히스토리 이동 재진입을 재현한다. 탭 표시는 init script가 다시 심는다.
    await seedPendingLogin(page);

    const signupConsent = await mockSignupConsent(page, SIGNUP_PENDING);

    await page.goto(APP_PATH.MAIN.STUDIO);
    await expect(consentDialog(page)).toBeVisible();
    await page.goto('about:blank');

    await page.goBack();

    await expect(
      page.getByRole('banner').getByRole('link', { name: '로그인' }),
    ).toBeVisible();
    await expect.poll(() => signupConsent.delete).toBe(1);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(
      await page.evaluate(
        () =>
          (
            performance.getEntriesByType(
              'navigation',
            )[0] as PerformanceNavigationTiming
          ).type,
      ),
    ).toBe('back_forward');
  });

  test('OAuth 오류로 로그인 화면이 열리면 남은 가입 대기를 비워 실패 안내만 띄운다', async ({
    page,
  }) => {
    // 지난 Google 화면에서 계정을 다시 골라 PKCE 확인에 실패한 경우다. 앞선 콜백의 대기가 남아 있다.
    await seedPendingLogin(page);

    const signupConsent = await mockSignupConsent(page, SIGNUP_PENDING);

    await page.goto(`${APP_PATH.LOGIN}?error=Configuration`);

    await expect(
      page.getByText(TOAST_MESSAGE.LOGIN_FAILED).first(),
    ).toBeVisible();
    await expect.poll(() => signupConsent.delete).toBe(1);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(signupConsent.get).toBe(0);
  });

  test('이 탭에서 시작한 로그인이 아니면 가입 대기를 조회하지 않고 시트도 띄우지 않는다', async ({
    page,
  }) => {
    const signupConsent = await mockSignupConsent(page, SIGNUP_PENDING);

    await page.goto(APP_PATH.MAIN.STUDIO);
    await expect(
      page.getByRole('banner').getByRole('link', { name: '로그인' }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(signupConsent.get).toBe(0);
  });

  test('시트의 문서 보기로 연 법적 문서 탭에는 가입 시트를 띄우지 않는다', async ({
    page,
  }) => {
    await seedPendingLogin(page);

    const signupConsent = await mockSignupConsent(page, SIGNUP_PENDING);

    await page.goto(APP_PATH.TERMS);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(signupConsent.get).toBe(0);

    // 양성 대조: 같은 탭에서 일반 화면으로 가면 표시와 대기가 그대로라 시트가 뜬다.
    await page.goto(APP_PATH.MAIN.STUDIO);
    await expect(consentDialog(page)).toBeVisible();
  });

  test('가입 대기가 없으면 게스트로 두되 탭 표시는 지우지 않아, 대기가 생긴 뒤 다시 불러오면 시트를 띄운다', async ({
    page,
  }) => {
    await seedPendingLogin(page);

    const signupConsent = await mockSignupConsent(page, null);

    await page.goto(APP_PATH.MAIN.STUDIO);
    await expect.poll(() => signupConsent.get).toBe(1);
    await expect(
      page.getByRole('banner').getByRole('link', { name: '로그인' }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => readPendingLogin(page)).toBe('1');

    // 인앱 팝업 로그인처럼 원래 탭이 404를 본 뒤에 서버가 대기를 남긴 경우다.
    signupConsent.setPending(SIGNUP_PENDING);
    await page.reload();
    await expect(consentDialog(page)).toBeVisible();
  });
});
