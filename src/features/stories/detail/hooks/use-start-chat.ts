'use client';

import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import {
  getGetChatDetailQueryOptions,
  useCreateChat,
} from '@/api/generated/endpoints/chats/chats';
import { getGetMyChatsQueryKey } from '@/api/generated/endpoints/users/users';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { isPaymentRequiredError } from '@/features/auth/login-required/utils/guest-limit-error';
import { saveCreatedChatId } from '@/features/chats/list/utils/chat-id-storage';
import type { GuestLimitTrigger } from '@/observability/analytics';
import { track } from '@/observability/analytics';

/**
 * 스토리 상세에서 채팅을 시작하는 훅.
 * 채팅 생성 후 ID를 로컬에 저장하고 상세 데이터를 프리페치한 뒤 채팅방으로 이동한다.
 */
export function useStartChat(storyId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status } = useSession();
  const [guestLimitTrigger, setGuestLimitTrigger] =
    useState<GuestLimitTrigger | null>(null);

  const createChat = useCreateChat({
    mutation: {
      onSuccess: async (response) => {
        const chatId = response.status === 201 ? response.data.id : undefined;

        if (!chatId) {
          return;
        }

        // 회원 서재는 서버가 정본 — 로그인 상태에서는 로컬에 ID를 남기지 않는다.
        if (status === 'authenticated') {
          void queryClient.invalidateQueries({
            queryKey: getGetMyChatsQueryKey(),
          });
        } else {
          saveCreatedChatId(chatId);
        }

        await queryClient.prefetchQuery(getGetChatDetailQueryOptions(chatId));
        router.replace(APP_PATH.CHAT_ROOM(chatId));
      },
      onError: (error) => {
        // 게스트의 체험 한도 초과(402)는 로그인 유도, 그 외(회원 402 포함)는 기존 실패 토스트.
        if (status !== 'authenticated' && isPaymentRequiredError(error)) {
          setGuestLimitTrigger('chat_start');

          return;
        }

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
    guestLimitTrigger,
    closeGuestLimitDialog: () => setGuestLimitTrigger(null),
  };
}
