import { expect, test as base } from '@playwright/test';

import { APP_BANNER_DISMISSED_KEY } from '@/lib/app-banner';

import {
  CHAT_MODELS_FIXTURE,
  CONSENTS_FIXTURE,
  CREDIT_POLICY_FIXTURE,
  CREDIT_PRODUCTS_FIXTURE,
  EXHAUSTED_TRIALS,
  GUEST_CONSENT_VERSION_FIXTURE,
  isPublicStoriesUrl,
  mockApi,
  mockChatShareCreate,
  mockChatShareView,
  mockConsents,
  mockCreditPolicies,
  mockCreditProducts,
  mockGuestConsents,
  mockPublicStories,
  mockPushSettings,
  mockPushTokens,
  mockSignupConsent,
  mockTrials,
  PUSH_SETTINGS_FIXTURE,
  TRIALS_FIXTURE,
} from './api-mock';

type AppBannerOptions = {
  /** 참이면 앱 안내 배너를 숨기지 않는다. 기본은 거짓이라 기존 스펙에는 배너가 뜨지 않는다. */
  appBanner: boolean;
};

// 모든 테스트에 API 안전망을 자동 적용하고, 배너 스펙이 아니면 새 탭까지 앱 안내 배너를 닫아 둔다.
export const test = base.extend<AppBannerOptions>({
  appBanner: [false, { option: true }],
  context: async ({ context, appBanner }, use) => {
    if (!appBanner) {
      await context.addInitScript((key) => {
        window.sessionStorage.setItem(key, '1');
      }, APP_BANNER_DISMISSED_KEY);
    }

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
  seedPendingCreditOrder,
  seedPendingLogin,
  seedStoryIds,
  skipChatChoicesHint,
  skipChatTour,
  skipOnboarding,
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
  isPublicStoriesUrl,
  mockConsents,
  mockGuestConsents,
  mockCreditPolicies,
  mockCreditProducts,
  mockPublicStories,
  mockPushSettings,
  mockPushTokens,
  mockSignupConsent,
  mockTrials,
  PUSH_SETTINGS_FIXTURE,
  TRIALS_FIXTURE,
};
