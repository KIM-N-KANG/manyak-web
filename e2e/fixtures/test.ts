/** @file 모든 E2E 스펙이 import 하는 확장 Playwright 진입점.
 *
 * Playwright 기본 `test` 대신 이 파일의 `test`를 쓰면 API 목과 컨텍스트 초기화가 자동으로 붙는다.
 * 스펙은 `storage`, `auth`, `api-mock` 헬퍼도 이 파일에서 함께 import 한다.
 */
import { expect, test as base } from '@playwright/test';

import { APP_BANNER_DISMISSED_KEY } from '@/lib/app-banner';

import {
  CHAT_MODELS_FIXTURE,
  CONSENTS_FIXTURE,
  CREDIT_POLICY_FIXTURE,
  CREDIT_PRODUCTS_FIXTURE,
  EXHAUSTED_TRIALS,
  GUEST_CONSENT_VERSION_FIXTURE,
  isExploreStoriesUrl,
  isHomeStoriesUrl,
  mockApi,
  mockChatShareCreate,
  mockChatShareView,
  mockConsents,
  mockCreditPolicies,
  mockCreditProducts,
  mockExploreStories,
  mockGuestConsents,
  mockHomeSections,
  mockHomeStories,
  mockNoticeDetail,
  mockNotices,
  mockNotificationReads,
  mockNotifications,
  mockNotificationUnreadCount,
  mockPushSettings,
  mockPushTokens,
  mockSignupConsent,
  mockStorySearch,
  mockTrials,
  NOTICE_DETAIL_FIXTURE,
  NOTICES_FIXTURE,
  NOTIFICATION_UNREAD_FIXTURE,
  NOTIFICATIONS_FIXTURE,
  PUSH_SETTINGS_FIXTURE,
  TRIALS_FIXTURE,
} from './api-mock';
import { skipCreateTutorial } from './storage';

type FixtureOptions = {
  /** 참이면 앱 안내 배너를 숨기지 않는다. 기본은 거짓이라 기존 스펙에는 배너가 뜨지 않는다. */
  appBanner: boolean;
  /** 참이면 간편 제작 첫 진입 안내를 끄지 않는다. 기본은 거짓이라 기존 스펙에는 안내가 뜨지 않는다. */
  createTutorial: boolean;
};

/**
 * API 목과 컨텍스트 초기화를 자동 적용한 Playwright `test`.
 *
 * @remarks
 * - `page`: 모든 페이지에 `mockApi`를 먼저 등록해 어떤 요청도 실서버로 새지 않게 한다. 스펙이 뒤에 등록한
 *   라우트가 기본 목보다 우선한다.
 * - `context`: 옵션으로 켜지 않으면 컨텍스트의 init script로 앱 안내 배너와 간편 제작 첫 진입 안내를 닫아 둔다.
 *   init script라 같은 컨텍스트에서 새로 연 탭에도 적용된다. `browser.newContext()`로 직접 만든 컨텍스트에는
 *   적용되지 않으므로 `skipCreateTutorial`을 따로 부른다.
 * - 옵션 `appBanner`, `createTutorial`: 기본은 거짓이다. 배너나 안내 자체를 검증하는 스펙만 `test.use`로 켠다.
 *
 * @example
 * ```ts
 * import { expect, test } from '../fixtures/test';
 *
 * test.use({ createTutorial: true });
 *
 * test('첫 진입 안내를 보여 준다', async ({ page }) => {
 *   await page.goto('/');
 * });
 * ```
 */
export const test = base.extend<FixtureOptions>({
  appBanner: [false, { option: true }],
  createTutorial: [false, { option: true }],
  context: async ({ context, appBanner, createTutorial }, use) => {
    if (!appBanner) {
      await context.addInitScript((key) => {
        window.sessionStorage.setItem(key, '1');
      }, APP_BANNER_DISMISSED_KEY);
    }

    if (!createTutorial) await skipCreateTutorial(context);

    await use(context);
  },
  page: async ({ page }, use) => {
    await mockApi(page);
    await use(page);
  },
});

export { expect };
export {
  enableRealtimeImage,
  seedChatIds,
  seedGuestChatIds,
  seedInviteOnboardingNextRun,
  seedPendingCreditOrder,
  seedPendingLogin,
  seedStoryIds,
  skipChatChoicesHint,
  skipChatTour,
  skipCreateTutorial,
} from './storage';
export {
  mockGuestSession,
  mockMemberSession,
  mockSignupConsentSignIn,
} from './auth';
export {
  CHAT_MODELS_FIXTURE,
  CONSENTS_FIXTURE,
  CREDIT_POLICY_FIXTURE,
  CREDIT_PRODUCTS_FIXTURE,
  EXHAUSTED_TRIALS,
  GUEST_CONSENT_VERSION_FIXTURE,
  mockChatShareCreate,
  mockChatShareView,
  isExploreStoriesUrl,
  isHomeStoriesUrl,
  mockConsents,
  mockGuestConsents,
  mockCreditPolicies,
  mockCreditProducts,
  mockExploreStories,
  mockHomeSections,
  mockHomeStories,
  mockNoticeDetail,
  mockNotices,
  mockNotificationReads,
  mockNotifications,
  mockNotificationUnreadCount,
  mockPushSettings,
  mockPushTokens,
  mockSignupConsent,
  mockStorySearch,
  mockTrials,
  NOTICE_DETAIL_FIXTURE,
  NOTICES_FIXTURE,
  NOTIFICATION_UNREAD_FIXTURE,
  NOTIFICATIONS_FIXTURE,
  PUSH_SETTINGS_FIXTURE,
  TRIALS_FIXTURE,
};
