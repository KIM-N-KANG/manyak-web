import type { Page } from '@playwright/test';

import {
  GUEST_USAGE_STORAGE_KEY,
  type GuestUsage,
} from '@/features/auth/_shared/utils/guest-usage-storage';
import { CREATED_CHAT_IDS_STORAGE_KEY } from '@/features/chats/_shared/utils/chat-id-storage';
import {
  ONBOARDING_SEEN_STORAGE_KEY,
  ONBOARDING_SEEN_VALUE,
} from '@/features/onboarding/constants';
import { CREATED_STORY_IDS_STORAGE_KEY } from '@/features/stories/_shared/utils/story-id-storage';
import {
  PENDING_CREATION_REQUEST_STORAGE_KEY,
  type PendingCreationRequest,
} from '@/features/stories/new/utils/creation-request-storage';

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
 * 로컬스토리지에 게스트 누적 사용량 카운터를 심는다.
 * 한도 도달 상태(스토리 생성 1회·채팅 5회 등)의 클라이언트 선차단을 재현할 때 쓴다.
 * 누락된 액션 카운터는 앱이 0으로 보정한다.
 */
export async function seedGuestUsage(
  page: Page,
  usage: Partial<GuestUsage>,
): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [GUEST_USAGE_STORAGE_KEY, JSON.stringify(usage)] as const,
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

/**
 * 로컬스토리지에 백그라운드 복구 대상 생성 요청 레코드를 심는다.
 * 스토리 생성 퍼널 재진입 시 복구 조회 폴링이 시작되는 상태를 재현할 때 쓴다.
 */
export async function seedPendingCreationRequest(
  page: Page,
  record: PendingCreationRequest,
): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [PENDING_CREATION_REQUEST_STORAGE_KEY, JSON.stringify(record)] as const,
  );
}
