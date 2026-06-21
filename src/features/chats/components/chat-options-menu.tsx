'use client';

import type { VariantProps } from 'class-variance-authority';

import { useDeleteChat } from '@/api/generated/endpoints/chats/chats';
import { OptionsMenu } from '@/components/common/options-menu';
import type { buttonVariants } from '@/components/ui/button';
import {
  getCreatedChatIdsSnapshot,
  parseCreatedChatIds,
  removeCreatedChatId,
  writeCreatedChatIds,
} from '@/features/chats/list/utils/chat-id-storage';
import { FetchError } from '@/lib/custom-fetch';

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

  const handleDelete = async () => {
    const previousChatIds = parseCreatedChatIds(getCreatedChatIdsSnapshot());

    removeCreatedChatId(chatId);

    try {
      await mutateAsync({ chatId });
    } catch (error) {
      if (error instanceof FetchError && error.status === 404) {
        return;
      }

      writeCreatedChatIds(previousChatIds);
      window.alert('채팅을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

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
