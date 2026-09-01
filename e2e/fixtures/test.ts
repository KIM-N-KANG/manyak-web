import { expect, test as base } from '@playwright/test';

import {
  CREDIT_POLICY_FIXTURE,
  mockApi,
  mockChatShareCreate,
  mockChatShareView,
  mockCreditPolicies,
  mockHandoffCreate,
  mockHandoffSession,
  mockHandoffStatus,
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
  seedGuestUsage,
  seedPendingHandoff,
  seedStoryIds,
  skipChatChoicesHint,
  skipChatTour,
  skipOnboarding,
} from './storage';
export { mockMemberSession } from './auth';
export {
  CREDIT_POLICY_FIXTURE,
  mockChatShareCreate,
  mockChatShareView,
  mockCreditPolicies,
  mockHandoffCreate,
  mockHandoffSession,
  mockHandoffStatus,
};
