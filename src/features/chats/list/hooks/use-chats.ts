'use client';

import { useQuery } from '@tanstack/react-query';

import { getChatsByIds } from '@/api/generated/endpoints/chats/chats';
import type { ChatSummaryResponse } from '@/api/generated/models';

import type { ChatListItem } from '../types';
import { useChatIds } from './use-chat-ids';

const CHATS_BATCH_QUERY_KEY = 'chats-batch';

const toChatListItems = (
  chatIds: string[],
  chats: ChatSummaryResponse[],
): ChatListItem[] => {
  const chatById = new Map(chats.map((chat) => [chat.id, chat]));

  return chatIds
    .map((chatId) => chatById.get(chatId))
    .filter((chat): chat is ChatSummaryResponse => chat != null)
    .filter(
      (chat): chat is Required<ChatSummaryResponse> =>
        chat.id != null &&
        chat.storyId != null &&
        chat.storyTitle != null &&
        chat.lastStoryPreview != null &&
        chat.updatedAt != null,
    );
};

export function useChats() {
  const chatIds = useChatIds();

  const query = useQuery({
    queryKey: [CHATS_BATCH_QUERY_KEY, chatIds],
    queryFn: async () => {
      const response = await getChatsByIds({ chatIds: chatIds ?? [] });
      const chats = response.status === 200 ? response.data : [];

      return toChatListItems(chatIds ?? [], chats);
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
