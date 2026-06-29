import { expect, test as base } from '@playwright/test';

import { mockApi } from './api-mock';

// 모든 테스트에 API 안전망을 자동 적용한다.
export const test = base.extend({
  page: async ({ page }, use) => {
    await mockApi(page);
    await use(page);
  },
});

export { expect };
export { seedChatIds, seedStoryIds, skipOnboarding } from './storage';
