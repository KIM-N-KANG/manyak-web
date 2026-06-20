'use client';

import { useSyncExternalStore } from 'react';

import {
  getCreatedChatIdsSnapshot,
  getServerCreatedChatIdsSnapshot,
  parseCreatedChatIds,
  SERVER_CHAT_IDS_SNAPSHOT,
  subscribeCreatedChatIds,
} from '../utils/chat-id-storage';

/**
 * 로컬스토리지에 보관 중인 채팅 ID 목록을 읽어옵니다.
 * 서버 렌더링 시점에는 ID를 알 수 없으므로 `null`을 반환합니다.
 */
export function useChatIds(): number[] | null {
  const snapshot = useSyncExternalStore<
    string | null | typeof SERVER_CHAT_IDS_SNAPSHOT
  >(
    subscribeCreatedChatIds,
    getCreatedChatIdsSnapshot,
    getServerCreatedChatIdsSnapshot,
  );

  if (snapshot === SERVER_CHAT_IDS_SNAPSHOT) {
    return null;
  }

  return parseCreatedChatIds(snapshot);
}
