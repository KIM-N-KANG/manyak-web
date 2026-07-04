'use client';

import { useQuery } from '@tanstack/react-query';

import { getChatsByIds } from '@/api/generated/endpoints/chats/chats';
import type { ChatSummaryResponse } from '@/api/generated/models';

import type { ChatListItem } from '../types';
import { useCreatedChatIds } from './use-created-chat-ids';

export const CHATS_BATCH_QUERY_KEY = 'chats-batch';

/**
 * 서버는 채팅 목록을 최신순(마지막 활동순)으로 응답하므로 그 순서를 그대로 보존합니다.
 * localStorage의 chatId 순서(생성순)로 재정렬하지 않습니다.
 */
export const toChatListItems = (
  chats: ChatSummaryResponse[],
): ChatListItem[] => {
  return chats.filter(
    (chat): chat is Required<ChatSummaryResponse> =>
      chat.id != null &&
      chat.storyId != null &&
      chat.storyTitle != null &&
      chat.lastStoryPreview != null &&
      chat.updatedAt != null,
  );
};

export function useCreatedChats() {
  const chatIds = useCreatedChatIds();

  const query = useQuery({
    queryKey: [CHATS_BATCH_QUERY_KEY, chatIds],
    queryFn: async () => {
      const response = await getChatsByIds({ chatIds: chatIds ?? [] });
      const chats = response.status === 200 ? response.data : [];

      return toChatListItems(chats);
    },
    enabled: chatIds != null && chatIds.length > 0,
  });

  const hasChatIds = chatIds != null && chatIds.length > 0;
  const isLoading = chatIds == null || (hasChatIds && query.isPending);
  const chats = query.data ?? [];

  return {
    chats,
    isLoading,
    isError: query.isError,
    isEmpty: !isLoading && !query.isError && chats.length === 0,
    refetch: query.refetch,
  };
}
