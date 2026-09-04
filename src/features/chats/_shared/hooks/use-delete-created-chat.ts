'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { useDeleteChat } from '@/api/generated/endpoints/chats/chats';
import { getGetMyChatsQueryKey } from '@/api/generated/endpoints/users/users';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  getCreatedChatIdsSnapshot,
  parseCreatedChatIds,
  removeCreatedChatId,
  writeCreatedChatIds,
} from '@/features/chats/_shared/utils/chat-id-storage';
import { useOptimisticCreatedResourceDelete } from '@/hooks/use-optimistic-created-resource-delete';

/**
 * 내 채팅을 삭제하는 핸들러와 진행 상태를 반환하는 훅.
 * 채팅 목록 카드와 채팅방 헤더 메뉴가 같은 절차(낙관 삭제·롤백·토스트)를 공유한다.
 *
 * @param chatId 삭제할 채팅 ID
 * @param onDeleteSuccess 삭제(또는 이미 삭제됨 404)가 확정된 뒤 실행할 콜백
 * @returns 삭제 핸들러와 서버 요청 진행 여부
 */
export function useDeleteCreatedChat(
  chatId: string,
  onDeleteSuccess?: () => void,
) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useDeleteChat();
  const deleteChat = useOptimisticCreatedResourceDelete({
    id: chatId,
    isGuest: status !== 'authenticated',
    getSnapshot: getCreatedChatIdsSnapshot,
    parseSnapshot: parseCreatedChatIds,
    removeId: removeCreatedChatId,
    writeIds: writeCreatedChatIds,
    invalidateServerLists: () =>
      void queryClient.invalidateQueries({
        queryKey: getGetMyChatsQueryKey(),
      }),
    deleteResource: () => mutateAsync({ chatId }),
    successMessage: TOAST_MESSAGE.CHAT_DELETED,
    failureMessage: TOAST_MESSAGE.CHAT_DELETE_FAILED,
    onDeleteSuccess,
  });

  return { deleteChat, isPending };
}
