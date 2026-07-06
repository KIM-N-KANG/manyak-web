'use client';

import { useGetChatDetail } from '@/api/generated/endpoints/chats/chats';
import type { ChatTurnResponse } from '@/api/generated/models';

/** 채팅 상세(스토리 제목, 프롤로그, 턴 목록, 추천 입력)를 조회하는 훅 */
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
