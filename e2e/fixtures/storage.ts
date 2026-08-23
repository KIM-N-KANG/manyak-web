import type { Page } from '@playwright/test';

import {
  GUEST_USAGE_STORAGE_KEY,
  type GuestUsage,
} from '@/features/auth/_shared/utils/guest-usage-storage';
import { PENDING_HANDOFF_STORAGE_KEY } from '@/features/auth/_shared/utils/pending-handoff-storage';
import { CREATED_CHAT_IDS_STORAGE_KEY } from '@/features/chats/_shared/utils/chat-id-storage';
import {
  CHAT_CHOICES_HINT_SEEN_STORAGE_KEY,
  CHAT_CHOICES_HINT_SEEN_VALUE,
  CHAT_TOUR_SEEN_STORAGE_KEY,
  CHAT_TOUR_SEEN_VALUE,
} from '@/features/chats/room/constants';
import {
  ONBOARDING_SEEN_COOKIE,
  ONBOARDING_SEEN_STORAGE_KEY,
  ONBOARDING_SEEN_VALUE,
} from '@/features/onboarding/constants';
import {
  PENDING_CREATION_REQUEST_STORAGE_KEY,
  type PendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { CREATED_STORY_IDS_STORAGE_KEY } from '@/features/stories/_shared/utils/story-id-storage';
import { AMP_MKTG_COOKIE_PREFIX } from '@/observability/analytics/amplitude-identity';

/**
 * 온보딩을 "이미 봄"으로 표시해 온보딩 페이지로 리다이렉트되지 않게 한다(US-8-3).
 * 서버(proxy) 판정용 쿠키와 클라이언트 가드용 로컬스토리지를 함께 심는다.
 */
export async function skipOnboarding(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: ONBOARDING_SEEN_COOKIE,
      value: ONBOARDING_SEEN_VALUE,
      domain: 'localhost',
      path: '/',
    },
  ]);
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
 * 채팅 화면 안내 투어를 "이미 봄"으로 표시해 자동 노출을 막는다(KNK-694).
 * 턴 0개 채팅에 진입하는 스펙은 투어 오버레이가 클릭을 가로채지 않도록 이 헬퍼를 쓴다.
 */
export async function skipChatTour(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [CHAT_TOUR_SEEN_STORAGE_KEY, CHAT_TOUR_SEEN_VALUE] as const,
  );
}

/** 추천 입력 힌트를 "이미 봄"으로 표시해 1회성 노출을 막는다(KNK-694). */
export async function skipChatChoicesHint(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [CHAT_CHOICES_HINT_SEEN_STORAGE_KEY, CHAT_CHOICES_HINT_SEEN_VALUE] as const,
  );
}

/**
 * 로컬스토리지에 진행 중인 로그인 핸드오프를 심는다.
 * 외부 로그인을 마치고 인앱으로 돌아온 뒤 이관 정리(useHandoffCleanup)가 트리거되는 상태를 재현한다.
 */
export async function seedPendingHandoff(
  page: Page,
  pending: {
    code: string;
    handoffId: string;
    storyIds: string[];
    chatIds: string[];
  },
): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [PENDING_HANDOFF_STORAGE_KEY, JSON.stringify(pending)] as const,
  );
}

/**
 * Amplitude가 캠페인 정보를 저장하는 형식(base64 → URL 인코드 → JSON)으로 마케팅 쿠키를
 * 심는다. 로컬·E2E는 분석이 비활성화돼 SDK가 이 쿠키를 만들지 않으므로, 유입 출처가
 * 남아 있는 상태를 재현하려면 직접 심어야 한다.
 */
export async function seedCampaignCookie(
  page: Page,
  campaign: Record<string, string>,
): Promise<void> {
  await page.context().addCookies([
    {
      name: `${AMP_MKTG_COOKIE_PREFIX}test123456`,
      value: btoa(encodeURIComponent(JSON.stringify(campaign))),
      domain: 'localhost',
      path: '/',
    },
  ]);
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
