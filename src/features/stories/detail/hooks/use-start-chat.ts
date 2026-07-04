'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  getGetChatDetailQueryOptions,
  useCreateChat,
} from '@/api/generated/endpoints/chats/chats';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { saveCreatedChatId } from '@/features/chats/list/utils/chat-id-storage';
import { track } from '@/observability/analytics';

export function useStartChat(storyId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createChat = useCreateChat({
    mutation: {
      onSuccess: async (response) => {
        const chatId = response.status === 201 ? response.data.id : undefined;

        if (!chatId) {
          return;
        }

        saveCreatedChatId(chatId);
        await queryClient.prefetchQuery(getGetChatDetailQueryOptions(chatId));
        router.replace(APP_PATH.CHAT_ROOM(chatId));
      },
      onError: () => {
        toast.error(TOAST_MESSAGE.CHAT_START_FAILED);
      },
    },
  });

  const startChat = () => {
    track('client_storyDetail_chatStartButton_clicked', { story_id: storyId });
    createChat.mutate({ data: { storyId } });
  };

  return {
    startChat,
    isStarting: createChat.isPending || createChat.isSuccess,
    isError: createChat.isError,
  };
}
