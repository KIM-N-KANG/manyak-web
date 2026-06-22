'use client';

import { useGetChatDetail } from '@/api/generated/endpoints/chats/chats';
import type { ChatTurnResponse } from '@/api/generated/models';

export function useChatDetail(chatId: string) {
  const query = useGetChatDetail(chatId);
  const detail = query.data?.data;

  return {
    storyTitle: detail?.storyTitle ?? '',
    prologue: detail?.prologue ?? '',
    turns: (detail?.turns ?? []) as ChatTurnResponse[],
    suggestedInputs: detail?.suggestedInputs ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
