'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import {
  getGetChatDetailQueryOptions,
  useCreateChat,
} from '@/api/generated/endpoints/chats/chats';
import { APP_PATH } from '@/constants/app-path';
import { saveCreatedChatId } from '@/features/chats/list/utils/chat-id-storage';

export function useStartChat(storyId: number) {
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
    },
  });

  const startChat = () => {
    createChat.mutate({ data: { storyId } });
  };

  return {
    startChat,
    isStarting: createChat.isPending || createChat.isSuccess,
    isError: createChat.isError,
  };
}
