import { Dexie, type Table } from 'dexie';

import type {
  PendingCreationRequest,
  StoryCompletionRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';

export const CREATION_DB_NAME = 'manyak-creation';
export const CREATION_EPOCH_KEY = 'manyak:creation-epoch';

const EPOCH_CHANGE_EVENT = 'manyak:creation-epoch-change';
let blockedStorage: Storage | null = null;

export type StoredCreation<T> = T & { storageOrder: number };
export type CreationMetadata = {
  key: 'state';
  epoch: number;
  migrated: boolean;
  sequence: number;
};

export const creationDb = new Dexie(CREATION_DB_NAME) as Dexie & {
  pendingCreations: Table<StoredCreation<PendingCreationRequest>, string>;
  storyCompletions: Table<StoredCreation<StoryCompletionRecord>, string>;
  metadata: Table<CreationMetadata, string>;
};

creationDb.version(1).stores({
  pendingCreations: 'requestId, storageOrder',
  storyCompletions: 'requestId, storageOrder, generationRequest.requestId',
  metadata: 'key',
});

/** 세션 종료 세대값만 동기식으로 읽어 비동기 쓰기와 계정 정리의 경계를 만든다. */
export function getCreationEpoch(): number {
  if (typeof window === 'undefined') return 0;

  try {
    if (blockedStorage === localStorage) return -1;

    const epoch = Number(localStorage.getItem(CREATION_EPOCH_KEY) ?? 0);

    return Number.isSafeInteger(epoch) && epoch >= 0 ? epoch : -1;
  } catch {
    return -1;
  }
}

/** DB 삭제보다 먼저 이전 세션의 작업을 무효화한다. */
export function invalidateCreationEpoch(): number {
  const epoch = Math.max(Date.now(), getCreationEpoch() + 1);

  try {
    localStorage.setItem(CREATION_EPOCH_KEY, String(epoch));
  } catch (error) {
    // 세대값조차 기록하지 못하면 이 탭에서는 제작 저장소를 다시 열지 않는다.
    blockedStorage = localStorage;

    throw error;
  } finally {
    window.dispatchEvent(new Event(EPOCH_CHANGE_EVENT));
  }

  return epoch;
}

/** 다른 탭의 로그아웃도 저장소 구독에 반영한다. */
export function subscribeCreationEpoch(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === CREATION_EPOCH_KEY || event.key === null) onChange();
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener(EPOCH_CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(EPOCH_CHANGE_EVENT, onChange);
  };
}
