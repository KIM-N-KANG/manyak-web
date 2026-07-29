'use client';

import {
  getChatShare,
  useGetChatShare,
} from '@/api/generated/endpoints/chats/chats';
import type { ChatShareTurnResponse } from '@/api/generated/models';
import { FetchError } from '@/lib/custom-fetch';
import { queryFnWithoutAbortSignal } from '@/lib/query-client';

/**
 * 공유된 채팅을 조회하는 훅.
 *
 * `isNotFound`는 삭제됐거나 존재하지 않는 링크다. 원본 채팅을 지우면 공유도 함께
 * 사라지므로 이미 내보낸 링크가 나중에 끊길 수 있고, 이 상태는 재시도로 풀리지
 * 않으므로 일반 오류와 구분해 다룬다.
 *
 * @param shareId 공유 열람 토큰
 * @returns 스토리 제목·프롤로그·턴 목록과 로딩·오류·없음 상태, refetch 함수
 */
export function useSharedChat(shareId: string) {
  const query = useGetChatShare(shareId, {
    query: {
      // StrictMode 이중 마운트로 두 번 조회되지 않도록 abort signal을 넘기지 않는다.
      queryFn: queryFnWithoutAbortSignal(() => getChatShare(shareId)),
    },
  });
  const share = query.data?.status === 200 ? query.data.data : undefined;
  const isNotFound =
    query.error instanceof FetchError && query.error.status === 404;

  return {
    storyTitle: share?.storyTitle ?? '',
    prologue: share?.prologue ?? '',
    turns: (share?.turns ?? []) as ChatShareTurnResponse[],
    isLoading: query.isPending,
    isError: query.isError && !isNotFound,
    isNotFound,
    refetch: query.refetch,
  };
}
