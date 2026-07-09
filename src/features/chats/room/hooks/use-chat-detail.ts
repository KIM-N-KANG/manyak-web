'use client';

import {
  getChatDetail,
  useGetChatDetail,
} from '@/api/generated/endpoints/chats/chats';
import type { ChatTurnResponse } from '@/api/generated/models';
import { queryFnWithoutAbortSignal } from '@/lib/query-client';

/** 채팅 상세(스토리 제목, 프롤로그, 턴 목록, 추천 입력)를 조회하는 훅 */
export function useChatDetail(chatId: string) {
  const query = useGetChatDetail(chatId, {
    query: {
      // StrictMode 이중 마운트로 상세가 두 번 조회되지 않도록 abort signal을
      // 전달하지 않는다. 배경은 queryFnWithoutAbortSignal 문서 참고.
      queryFn: queryFnWithoutAbortSignal(() => getChatDetail(chatId)),
    },
  });
  const detail = query.data?.status === 200 ? query.data.data : undefined;

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
