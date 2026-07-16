'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { getChatsByIds } from '@/api/generated/endpoints/chats/chats';
import { useGetMyChats } from '@/api/generated/endpoints/users/users';
import type { ChatSummaryResponse } from '@/api/generated/models';
import { useCreatedChatIds } from '@/features/chats/_shared/hooks/use-created-chat-ids';

import type { ChatListItem } from '../types';

/** 채팅 ID 목록 일괄 조회 쿼리의 캐시 키 */
export const CHATS_BATCH_QUERY_KEY = 'chats-batch';

/**
 * 서버는 채팅 목록을 최신순(마지막 활동순)으로 응답하므로 그 순서를 그대로 보존한다.
 * localStorage의 chatId 순서(생성순)로 재정렬하지 않는다.
 *
 * @param chats 서버가 응답한 채팅 요약 목록
 * @returns 필수 필드가 모두 채워진 채팅 목록 아이템 배열
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

/**
 * 사용자의 채팅 목록을 조회하는 훅.
 * 회원은 서버 회원 목록(/users/me/chats), 게스트는 로컬 ID 배치 조회를 사용하며
 * 두 모드 모두 동일한 형태(목록·로딩·에러·빈 상태)를 반환한다.
 *
 * @returns 채팅 목록과 로딩·에러·빈 상태, refetch 함수를 담은 객체
 */
export function useCreatedChats() {
  const { status } = useSession();
  const chatIds = useCreatedChatIds();

  const myChatsQuery = useGetMyChats(undefined, {
    query: { enabled: status === 'authenticated' },
  });

  const hasChatIds = chatIds != null && chatIds.length > 0;
  const guestQuery = useQuery({
    queryKey: [CHATS_BATCH_QUERY_KEY, chatIds],
    queryFn: async () => {
      const response = await getChatsByIds({ chatIds: chatIds ?? [] });
      const chats = response.status === 200 ? response.data : [];

      return toChatListItems(chats);
    },
    enabled: status === 'unauthenticated' && hasChatIds,
  });

  // 세션 판별 중('loading')에는 회원 분기의 로딩 상태를 보여 깜빡임을 막는다.
  if (status !== 'unauthenticated') {
    const chats =
      myChatsQuery.data?.status === 200
        ? toChatListItems(myChatsQuery.data.data)
        : [];
    const isError =
      myChatsQuery.isError ||
      (myChatsQuery.data != null && myChatsQuery.data.status !== 200);
    const isLoading = status === 'loading' || myChatsQuery.isPending;

    return {
      chats,
      isLoading,
      isError,
      isEmpty: !isLoading && !isError && chats.length === 0,
      refetch: myChatsQuery.refetch,
    };
  }

  const isLoading = chatIds == null || (hasChatIds && guestQuery.isPending);
  const chats = guestQuery.data ?? [];

  return {
    chats,
    isLoading,
    isError: guestQuery.isError,
    isEmpty: !isLoading && !guestQuery.isError && chats.length === 0,
    refetch: guestQuery.refetch,
  };
}
