import type { Page } from '@playwright/test';

import { CREATED_CHAT_IDS_STORAGE_KEY } from '@/features/chats/list/utils/chat-id-storage';
import {
  ONBOARDING_SEEN_STORAGE_KEY,
  ONBOARDING_SEEN_VALUE,
} from '@/features/onboarding/constants';
import { CREATED_STORY_IDS_STORAGE_KEY } from '@/features/stories/new/utils/story-id-storage';

/** 온보딩을 "이미 봄"으로 표시해 다이얼로그가 뜨지 않게 한다(US-8-3). */
export async function skipOnboarding(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [ONBOARDING_SEEN_STORAGE_KEY, ONBOARDING_SEEN_VALUE] as const,
  );
}

/**
 * 로컬스토리지에 "보관 중인 스토리 ID" 목록을 심는다.
 * 스토리 목록 화면은 이 ID로 batch 조회하며, ID가 있으면 온보딩 게이팅도 통과한다.
 */
export async function seedStoryIds(
  page: Page,
  storyIds: string[],
): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [CREATED_STORY_IDS_STORAGE_KEY, JSON.stringify(storyIds)] as const,
  );
}

/**
 * 로컬스토리지에 "보관 중인 채팅 ID" 목록을 심는다.
 * 채팅 목록 화면은 이 ID로 batch 조회하며, ID가 있으면 온보딩 게이팅도 통과한다.
 */
export async function seedChatIds(
  page: Page,
  chatIds: string[],
): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [CREATED_CHAT_IDS_STORAGE_KEY, JSON.stringify(chatIds)] as const,
  );
}
