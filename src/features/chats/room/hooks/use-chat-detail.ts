'use client';

import {
  getChatDetail,
  useGetChatDetail,
} from '@/api/generated/endpoints/chats/chats';
import type { ChatTurnResponse } from '@/api/generated/models';
import { FetchError } from '@/lib/custom-fetch';
import { queryFnWithoutAbortSignal } from '@/lib/query-client';

/**
 * 채팅 상세(참조 스토리 ID·제목, 프롤로그, 턴 목록, 추천 입력)를 조회하는 훅
 *
 * `isForbidden`은 게스트-회원 교차 접근 차단(백엔드 §4-5)에 걸린 상태다. 게스트가 만든
 * 채팅(`user_id` NULL)은 회원 요청에 403이며, 이관으로 소유권이 옮겨져야 열린다. 이관 창이
 * 닫힌 계정에서는 영구적이라 재시도로 풀리지 않으므로 일반 오류와 구분해 다룬다.
 *
 * @param chatId 조회할 채팅 ID
 * @returns 스토리 ID·제목·프롤로그·턴 목록·추천 입력과 로딩·에러·차단 상태, refetch 함수.
 *   참조 스토리가 삭제되면 서버가 제목을 비워 보내므로 `storyId`도 null로 정리한다
 */
export function useChatDetail(chatId: string) {
  const query = useGetChatDetail(chatId, {
    query: {
      // StrictMode 이중 마운트로 상세가 두 번 조회되지 않도록 abort signal을
      // 전달하지 않는다. 배경은 queryFnWithoutAbortSignal 문서 참고.
      queryFn: queryFnWithoutAbortSignal(() => getChatDetail(chatId)),
    },
  });
  const detail = query.data?.status === 200 ? query.data.data : undefined;
  const isForbidden =
    query.error instanceof FetchError && query.error.status === 403;

  const storyTitle = detail?.storyTitle?.trim() ?? '';

  return {
    storyId: storyTitle && detail?.storyId ? detail.storyId : null,
    storyTitle,
    prologue: detail?.prologue ?? '',
    turns: (detail?.turns ?? []) as ChatTurnResponse[],
    suggestedInputs: detail?.suggestedInputs ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    isForbidden,
    refetch: query.refetch,
  };
}
