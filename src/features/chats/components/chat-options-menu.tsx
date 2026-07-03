'use client';

import type { VariantProps } from 'class-variance-authority';

import { useDeleteChat } from '@/api/generated/endpoints/chats/chats';
import { OptionsMenu } from '@/components/common/options-menu';
import type { buttonVariants } from '@/components/ui/button';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  getCreatedChatIdsSnapshot,
  parseCreatedChatIds,
  removeCreatedChatId,
  writeCreatedChatIds,
} from '@/features/chats/list/utils/chat-id-storage';
import { useOptimisticCreatedResourceDelete } from '@/hooks/use-optimistic-created-resource-delete';

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

type ChatOptionsMenuProps = {
  chatId: string;
  size?: ButtonSize;
  triggerClassName?: string;
};

export function ChatOptionsMenu({
  chatId,
  size = 'icon-xs',
  triggerClassName,
}: ChatOptionsMenuProps) {
  const { mutateAsync, isPending } = useDeleteChat();
  const handleDelete = useOptimisticCreatedResourceDelete({
    id: chatId,
    getSnapshot: getCreatedChatIdsSnapshot,
    parseSnapshot: parseCreatedChatIds,
    removeId: removeCreatedChatId,
    writeIds: writeCreatedChatIds,
    deleteResource: () => mutateAsync({ chatId }),
    successMessage: TOAST_MESSAGE.CHAT_DELETED,
    failureMessage: TOAST_MESSAGE.CHAT_DELETE_FAILED,
  });

  return (
    <OptionsMenu
      onDelete={handleDelete}
      isDeleting={isPending}
      triggerAriaLabel="채팅 옵션 더보기"
      confirmTitle="채팅을 삭제할까요?"
      size={size}
      triggerClassName={triggerClassName}
    />
  );
}
