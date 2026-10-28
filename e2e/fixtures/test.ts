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
  mockNoticeDetail,
  mockNotices,
  mockNotificationReads,
  mockNotifications,
  mockNotificationUnreadCount,
  mockPublicStories,
  mockPushSettings,
  mockPushTokens,
  mockSignupConsent,
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

// 모든 테스트에 API 안전망을 자동 적용하고, 옵션으로 켜지 않으면 새 탭까지 앱 안내 배너와
// 간편 제작 첫 진입 안내를 닫아 둔다.
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
  isPublicStoriesUrl,
  mockConsents,
  mockGuestConsents,
  mockCreditPolicies,
  mockCreditProducts,
  mockPublicStories,
  mockNoticeDetail,
  mockNotices,
  mockNotificationReads,
  mockNotifications,
  mockNotificationUnreadCount,
  mockPushSettings,
  mockPushTokens,
  mockSignupConsent,
  mockTrials,
  NOTICE_DETAIL_FIXTURE,
  NOTICES_FIXTURE,
  NOTIFICATION_UNREAD_FIXTURE,
  NOTIFICATIONS_FIXTURE,
  PUSH_SETTINGS_FIXTURE,
  TRIALS_FIXTURE,
};
