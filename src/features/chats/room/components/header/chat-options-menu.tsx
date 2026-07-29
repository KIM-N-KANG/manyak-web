'use client';

import { Delete02Icon, Share08Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { useDeleteChat } from '@/api/generated/endpoints/chats/chats';
import { getGetMyChatsQueryKey } from '@/api/generated/endpoints/users/users';
import { OptionsMenu } from '@/components/common/options-menu';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  getCreatedChatIdsSnapshot,
  parseCreatedChatIds,
  removeCreatedChatId,
  writeCreatedChatIds,
} from '@/features/chats/_shared/utils/chat-id-storage';
import { useOptimisticCreatedResourceDelete } from '@/hooks/use-optimistic-created-resource-delete';

import { useChatShare } from '../../hooks/use-chat-share';

type ChatOptionsMenuProps = {
  chatId: string;
  turnCount: number;
};

export function ChatOptionsMenu({ chatId, turnCount }: ChatOptionsMenuProps) {
  const router = useRouter();
  const { status } = useSession();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useDeleteChat();
  const handleDelete = useOptimisticCreatedResourceDelete({
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
    onDeleteSuccess: () => router.replace(APP_PATH.MAIN.CHATS),
  });
  const { share, isSharing } = useChatShare(chatId, turnCount);

  return (
    <OptionsMenu
      triggerAriaLabel="채팅 옵션 더보기"
      size="icon"
      items={[
        {
          icon: Share08Icon,
          label: '공유하기',
          onSelect: share,
          disabled: isSharing,
        },
        {
          icon: Delete02Icon,
          label: '채팅 삭제하기',
          variant: 'destructive',
          onSelect: handleDelete,
          confirm: { title: '채팅을 삭제할까요?', isPending },
        },
      ]}
    />
  );
}
