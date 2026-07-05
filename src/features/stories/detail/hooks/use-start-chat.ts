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

/**
 * 스토리 상세에서 채팅을 시작하는 훅.
 * 채팅 생성 후 ID를 로컬에 저장하고 상세 데이터를 프리페치한 뒤 채팅방으로 이동한다.
 */
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
