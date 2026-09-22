import { expect, test as base } from '@playwright/test';

import {
  CONSENTS_FIXTURE,
  CREDIT_POLICY_FIXTURE,
  CREDIT_PRODUCTS_FIXTURE,
  EXHAUSTED_TRIALS,
  GUEST_CONSENT_VERSION_FIXTURE,
  mockApi,
  mockChatShareCreate,
  mockChatShareView,
  mockConsents,
  mockCreditPolicies,
  mockCreditProducts,
  mockGuestConsents,
  mockHandoffSession,
  mockHandoffStatus,
  mockPushSettings,
  mockPushTokens,
  mockTrials,
  PUSH_SETTINGS_FIXTURE,
  TRIALS_FIXTURE,
} from './api-mock';

// 모든 테스트에 API 안전망을 자동 적용한다.
export const test = base.extend({
  page: async ({ page }, use) => {
    await mockApi(page);
    await use(page);
  },
});

export { expect };
export {
  seedChatIds,
  seedGuestChatIds,
  seedPendingCreditOrder,
  seedPendingHandoff,
  seedPendingLogin,
  seedStoryIds,
  skipChatChoicesHint,
  skipChatTour,
  skipOnboarding,
} from './storage';
export { mockGuestSession, mockMemberSession } from './auth';
export {
  CONSENTS_FIXTURE,
  CREDIT_POLICY_FIXTURE,
  CREDIT_PRODUCTS_FIXTURE,
  EXHAUSTED_TRIALS,
  GUEST_CONSENT_VERSION_FIXTURE,
  mockChatShareCreate,
  mockChatShareView,
  mockConsents,
  mockGuestConsents,
  mockCreditPolicies,
  mockCreditProducts,
  mockHandoffSession,
  mockHandoffStatus,
  mockPushSettings,
  mockPushTokens,
  mockTrials,
  PUSH_SETTINGS_FIXTURE,
  TRIALS_FIXTURE,
};
