'use client';

import { useSyncExternalStore } from 'react';

import {
  getCreatedStoryIdsSnapshot,
  getServerCreatedStoryIdsSnapshot,
  parseCreatedStoryIds,
  SERVER_STORY_IDS_SNAPSHOT,
  subscribeCreatedStoryIds,
} from '@/features/stories/new/utils/story-id-storage';

/**
 * 로컬스토리지에 보관 중인 스토리 ID 목록을 읽어옵니다.
 * 서버 렌더링 시점에는 ID를 알 수 없으므로 `null`을 반환합니다.
 */
export function useCreatedStoryIds(): string[] | null {
  const snapshot = useSyncExternalStore<
    string | null | typeof SERVER_STORY_IDS_SNAPSHOT
  >(
    subscribeCreatedStoryIds,
    getCreatedStoryIdsSnapshot,
    getServerCreatedStoryIdsSnapshot,
  );

  if (snapshot === SERVER_STORY_IDS_SNAPSHOT) {
    return null;
  }

  return parseCreatedStoryIds(snapshot);
}
