import type { Page } from '@playwright/test';

import { PENDING_HANDOFF_STORAGE_KEY } from '@/features/auth/_shared/utils/pending-handoff-storage';
import { PENDING_LOGIN_STORAGE_KEY } from '@/features/auth/_shared/utils/pending-login-storage';
import { CREATED_CHAT_IDS_STORAGE_KEY } from '@/features/chats/_shared/utils/chat-id-storage';
import { GUEST_CHAT_IDS_STORAGE_KEY } from '@/features/chats/_shared/utils/guest-chat-storage';
import {
  CHAT_CHOICES_HINT_SEEN_STORAGE_KEY,
  CHAT_CHOICES_HINT_SEEN_VALUE,
  CHAT_TOUR_SEEN_STORAGE_KEY,
  CHAT_TOUR_SEEN_VALUE,
} from '@/features/chats/room/constants';
import { PENDING_CREDIT_ORDER_STORAGE_KEY } from '@/features/my/credits/utils/pending-credit-order-storage';
import {
  ONBOARDING_SEEN_COOKIE,
  ONBOARDING_SEEN_STORAGE_KEY,
  ONBOARDING_SEEN_VALUE,
} from '@/features/onboarding/constants';
import { CREATION_DB_NAME } from '@/features/stories/_shared/utils/creation-db';
import {
  type PendingCreationRequest,
  STORY_COMPLETION_REQUESTS_STORAGE_KEY,
  type StoryCompletionRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { DRAFT_RESUME_INTENT_STORAGE_KEY } from '@/features/stories/_shared/utils/draft-resume-intent';
import { CREATED_STORY_IDS_STORAGE_KEY } from '@/features/stories/_shared/utils/story-id-storage';

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
 * 결제창으로 나가기 직전 남긴 이프 충전 대기 주문을 심는다.
 * 그로블에서 `/my/credits`로 돌아와 주문 확인 카드가 폴링을 시작하는 상태를 재현한다.
 */
export async function seedPendingCreditOrder(
  page: Page,
  orderId: string,
): Promise<void> {
  await page.addInitScript(
    ([key, id]) => {
      // 결제창으로 나가기 전 한 번 남긴 기록을 흉내 낸다. 새로고침·리다이렉트마다 다시
      // 심으면 앱이 지운 기록이 되살아나므로 탭 단위로 한 번만 심는다.
      const seededKey = `${key}:seeded`;

      if (window.sessionStorage.getItem(seededKey)) {
        return;
      }

      window.sessionStorage.setItem(seededKey, '1');
      window.localStorage.setItem(
        key,
        JSON.stringify({ orderId: id, savedAt: Date.now() }),
      );
    },
    [PENDING_CREDIT_ORDER_STORAGE_KEY, orderId] as const,
  );
}

/**
 * IndexedDB의 편집 초안 목록에 초안·스토리라인 생성 레코드를 심는다.
 * 제작 탭 카드 표시와 "이어서 만들기" 재개, 복구 조회 폴링이 시작되는 상태를 재현할 때 쓴다.
 */
export async function seedPendingCreationRequests(
  page: Page,
  records: PendingCreationRequest[],
): Promise<void> {
  await seedCreationRecords(page, 'pendingCreations', records);
}

/**
 * 진행 카드 "이어서 만들기"가 남기는 재개 의도(sessionStorage)를 심는다.
 * 퍼널 직접 진입은 새 세션이므로, 특정 레코드를 복원하는 진입을 재현할 때 쓴다.
 */
export async function seedDraftResumeIntent(
  page: Page,
  requestId: string,
): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.sessionStorage.setItem(key, value);
    },
    [DRAFT_RESUME_INTENT_STORAGE_KEY, requestId] as const,
  );
}

/**
 * IndexedDB의 완성 요청 목록에 레코드를 심는다.
 * 제작 탭의 완성 중 카드 폴링이 시작되는 상태를 재현할 때 쓴다.
 */
export async function seedStoryCompletionRequests(
  page: Page,
  records: StoryCompletionRecord[],
): Promise<void> {
  await seedCreationRecords(page, 'storyCompletions', records);
}

/**
 * 이 탭에서 OAuth를 시작했다는 표시(sessionStorage)를 심는다.
 * OAuth 복귀·같은 탭 새로고침처럼 동의 시트가 이어져야 하는 상태를 재현한다. 심지 않으면
 * 동의가 남은 회원 세션은 이전 탭의 미완 로그인으로 판정돼 로그아웃된다.
 */
export async function seedPendingLogin(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, '1');
  }, PENDING_LOGIN_STORAGE_KEY);
}

/**
 * 이 탭에서 게스트로 시작한 채팅 ID(sessionStorage)를 심는다.
 * 채팅 목록에는 없지만 로그인 후 이관·핸드오프에 실려야 하는 상태를 재현한다.
 */
export async function seedGuestChatIds(
  page: Page,
  chatIds: string[],
): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.sessionStorage.setItem(key, value);
    },
    [GUEST_CHAT_IDS_STORAGE_KEY, JSON.stringify(chatIds)] as const,
  );
}

/** 앱보다 먼저 DB 초기화를 예약하며 새로고침에서 같은 데이터를 다시 심지 않는다. */
async function seedCreationRecords(
  page: Page,
  table: 'pendingCreations' | 'storyCompletions',
  records: (PendingCreationRequest | StoryCompletionRecord)[],
) {
  await page.addInitScript(
    ({ name, table, records }) => {
      const marker = `e2e:${table}`;

      if (sessionStorage.getItem(marker)) return;

      const open = indexedDB.open(name, 10);

      open.onupgradeneeded = () => {
        const db = open.result;
        const pending = db.createObjectStore('pendingCreations', {
          keyPath: 'requestId',
        });

        pending.createIndex('storageOrder', 'storageOrder');

        const completion = db.createObjectStore('storyCompletions', {
          keyPath: 'requestId',
        });

        completion.createIndex('storageOrder', 'storageOrder');
        completion.createIndex(
          'generationRequest.requestId',
          'generationRequest.requestId',
        );
        db.createObjectStore('metadata', { keyPath: 'key' });
      };
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction([table, 'metadata'], 'readwrite');
        const state = tx.objectStore('metadata').get('state');

        state.onsuccess = () => {
          let sequence = state.result?.sequence ?? 0;

          for (const record of records)
            tx.objectStore(table).put({ ...record, storageOrder: ++sequence });

          tx.objectStore('metadata').put({
            key: 'state',
            epoch: 0,
            migrated: true,
            sequence,
          });
        };
        tx.oncomplete = () => {
          sessionStorage.setItem(marker, '1');
          db.close();
        };
        tx.onabort = () => db.close();
      };
    },
    { name: CREATION_DB_NAME, table, records },
  );
}

/** 실제 IndexedDB의 레코드를 기존 JSON 단언 형식으로 읽는다. */
export async function readCreationStorage(
  page: Page,
  key: string,
): Promise<string | null> {
  const table =
    key === STORY_COMPLETION_REQUESTS_STORAGE_KEY
      ? 'storyCompletions'
      : 'pendingCreations';

  return page.evaluate(
    ({ name, table }) =>
      new Promise<string | null>((resolve, reject) => {
        const open = indexedDB.open(name);

        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(table, 'readonly');
          const request = tx.objectStore(table).index('storageOrder').getAll();

          request.onerror = () => reject(request.error);
          tx.oncomplete = () => {
            db.close();
            resolve(
              request.result.length ? JSON.stringify(request.result) : null,
            );
          };
        };
      }),
    { name: CREATION_DB_NAME, table },
  );
}
