import { expect, test as base } from '@playwright/test';

import {
  CREDIT_POLICY_FIXTURE,
  CREDIT_PRODUCTS_FIXTURE,
  EXHAUSTED_TRIALS,
  mockApi,
  mockChatShareCreate,
  mockChatShareView,
  mockCreditPolicies,
  mockCreditProducts,
  mockHandoffCreate,
  mockHandoffSession,
  mockHandoffStatus,
  mockTrials,
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
  seedCampaignCookie,
  seedChatIds,
  seedPendingCreditOrder,
  seedPendingHandoff,
  seedStoryIds,
  skipChatChoicesHint,
  skipChatTour,
  skipOnboarding,
} from './storage';
export { mockMemberSession } from './auth';
export {
  CREDIT_POLICY_FIXTURE,
  CREDIT_PRODUCTS_FIXTURE,
  EXHAUSTED_TRIALS,
  mockChatShareCreate,
  mockChatShareView,
  mockCreditPolicies,
  mockCreditProducts,
  mockHandoffCreate,
  mockHandoffSession,
  mockHandoffStatus,
  mockTrials,
  TRIALS_FIXTURE,
};
