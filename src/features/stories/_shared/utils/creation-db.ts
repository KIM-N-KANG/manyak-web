/**
 * @file 제작 저장소의 IndexedDB 스키마와 세션 세대값(epoch).
 *
 * 세대값은 localStorage에 동기식으로 두고 로그아웃마다 키운다. DB의 `metadata` 행이 기억하는
 * 세대값과 다르면 이전 세션의 쓰기를 거절하고 다음 초기화에서 두 제작 테이블을 비운다.
 * 레코드 읽기와 쓰기 규칙은 `creation-request-storage.ts`가 맡는다.
 */
import { Dexie, type Table } from 'dexie';

import type {
  PendingCreationRequest,
  StoryCompletionRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';

export const CREATION_DB_NAME = 'manyak-creation';
/**
 * 세션 세대값을 두는 localStorage 키다. 다른 탭의 `storage` 이벤트로 로그아웃을 알아채는 데도 쓴다.
 *
 * @see getCreationEpoch
 */
export const CREATION_EPOCH_KEY = 'manyak:creation-epoch';

const EPOCH_CHANGE_EVENT = 'manyak:creation-epoch-change';
/** 세대값 기록에 실패한 localStorage다. 지금 localStorage와 같으면 이 탭의 제작 저장소를 닫아 둔다. */
let blockedStorage: Storage | null = null;

/**
 * DB에 저장되는 레코드 형태다. `storageOrder`는 `CreationMetadata.sequence`가 발급한 저장 순번으로,
 * 목록을 저장한 순서대로 읽는 인덱스이며 도메인 레코드로 돌려줄 때는 뺀다.
 *
 * @template T 저장할 도메인 레코드 타입
 */
export type StoredCreation<T> = T & { storageOrder: number };
/** `metadata` 테이블의 단일 행. 세대값 비교와 저장 순번 발급을 맡는다. */
export type CreationMetadata = {
  key: 'state';
  /** DB를 마지막으로 초기화한 세션 세대값. localStorage 세대값과 다르면 쓰기를 거절한다. */
  epoch: number;
  /** 구 localStorage 저장소를 이관했는지. 세션 종료 뒤에도 참으로 남겨 재이관을 막는다. */
  migrated: boolean;
  /** 마지막으로 발급한 `storageOrder`. 세션 종료 때 0으로 되돌린다. */
  sequence: number;
};

/**
 * 제작 기록 IndexedDB(Dexie) 인스턴스.
 *
 * @remarks
 * 스키마 버전 1이다. `pendingCreations`는 편집 초안과 스토리라인 생성 진행 기록, `storyCompletions`는
 * 완성 요청 기록, `metadata`는 `CreationMetadata` 한 행을 담는다. `storyCompletions`의
 * `generationRequest.requestId` 인덱스는 같은 제작의 초안이 이미 완성 요청으로 넘어갔는지 찾는 데 쓴다.
 */
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

/**
 * 세션 종료 세대값만 동기식으로 읽어 비동기 쓰기와 계정 정리의 경계를 만든다.
 *
 * @returns 현재 세대값. 한 번도 세션을 종료하지 않았거나 서버 렌더링이면 0, localStorage를 읽을 수 없거나
 * 값이 손상됐거나 이 탭이 세대값 기록에 실패했으면 -1(사용 불가)
 */
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

/**
 * DB 삭제보다 먼저 이전 세션의 작업을 무효화한다. 성공과 실패 모두 현재 탭의 구독자에게 알린다.
 *
 * @returns 새로 기록한 세대값. 현재 시각(ms)과 이전 값 + 1 중 큰 값이다.
 * @throws localStorage 기록에 실패하면 그 오류를 다시 던지고, 이 탭의 제작 저장소를 닫아 둔다.
 */
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

/**
 * 다른 탭의 로그아웃도 저장소 구독에 반영한다. `useSyncExternalStore`의 구독 함수 형태다.
 *
 * @param onChange 같은 탭의 무효화, 다른 탭의 세대값 변경, localStorage 전체 삭제 때 호출된다.
 * @returns 구독 해제 함수
 */
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
