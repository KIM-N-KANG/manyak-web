import type { Page } from '@playwright/test';

import {
  ONBOARDING_SEEN_STORAGE_KEY,
  ONBOARDING_SEEN_VALUE,
} from '@/features/onboarding/constants';

/** 온보딩을 "이미 봄"으로 표시해 다이얼로그가 뜨지 않게 한다(US-8-3). */
export async function skipOnboarding(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [ONBOARDING_SEEN_STORAGE_KEY, ONBOARDING_SEEN_VALUE] as const,
  );
}
