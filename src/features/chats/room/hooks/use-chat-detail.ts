'use client';

import {
  getChatDetail,
  useGetChatDetail,
} from '@/api/generated/endpoints/chats/chats';
import type { ChatTurnResponse } from '@/api/generated/models';

/** 채팅 상세(스토리 제목, 프롤로그, 턴 목록, 추천 입력)를 조회하는 훅 */
export function useChatDetail(chatId: string) {
  const query = useGetChatDetail(chatId, {
    query: {
      // React StrictMode(dev)의 마운트→언마운트→재마운트 과정에서, 첫 요청에
      // React Query의 abort signal이 전달되면 언마운트 시점에 그 요청이 취소되고
      // 재마운트가 새 요청을 발생시켜 상세 조회가 두 번 호출된다. SessionProvider의
      // 초기 loading→loaded 리렌더가 이 타이밍을 벌려 중복 호출이 표면화된다.
      // 상세 조회는 멱등한 GET이라 취소 이득이 없으므로 signal을 넘기지 않아
      // in-flight 요청이 재사용(dedupe)되도록 한다.
      queryFn: () => getChatDetail(chatId),
    },
  });
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
