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
import { resolvePaymentRequiredReason } from '@/features/auth/login-required/utils/guest-limit-error';
import { isGuestOverLimit } from '@/features/auth/login-required/utils/guest-usage-storage';
import { saveCreatedChatId } from '@/features/chats/list/utils/chat-id-storage';
import type {
  CreditShortageTrigger,
  GuestLimitTrigger,
} from '@/observability/analytics';
import { track } from '@/observability/analytics';

/**
 * 스토리 상세에서 채팅을 시작하는 훅.
 * 채팅 생성 후 ID를 로컬에 저장하고 상세 데이터를 프리페치한 뒤 채팅방으로 이동한다.
 * startSettingId를 넘기면 해당 시작 설정으로 시작한다(생략 시 백엔드가 첫 설정 사용).
 *
 * @param storyId 채팅을 시작할 스토리 id
 * @param startSettingId 사용할 시작 설정 id(생략 시 백엔드가 첫 설정 사용)
 * @returns 채팅 시작 함수와 진행/에러 상태, 한도·크레딧 다이얼로그 제어값
 */
export function useStartChat(storyId: string, startSettingId?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status } = useSession();
  const [guestLimitTrigger, setGuestLimitTrigger] =
    useState<GuestLimitTrigger | null>(null);
  const [creditShortageTrigger, setCreditShortageTrigger] =
    useState<CreditShortageTrigger | null>(null);

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
        // 게스트 체험 한도면 로그인 유도, 회원 크레딧 부족이면 크레딧 획득 유도, 그 외는 실패 토스트.
        // 사유는 응답 바디 code로 구분하고(백엔드 KNK-524), code가 없으면 세션 상태로 폴백한다.
        const reason = resolvePaymentRequiredReason(error, status);

        if (reason === 'guest-trial-limit') {
          setGuestLimitTrigger('chat_start');

          return;
        }

        if (reason === 'insufficient-credit') {
          setCreditShortageTrigger('chat_start');

          return;
        }

        toast.error(TOAST_MESSAGE.CHAT_START_FAILED);
      },
    },
  });

  const startChat = () => {
    if (isGuestOverLimit(status, 'chat')) {
      setGuestLimitTrigger('chat_start');

      return;
    }

    track('client_storyDetail_chatStartButton_clicked', { story_id: storyId });
    createChat.mutate({ data: { storyId, startSettingId } });
  };

  return {
    startChat,
    isStarting: createChat.isPending || createChat.isSuccess,
    isError: createChat.isError,
    guestLimitTrigger,
    closeGuestLimitDialog: () => setGuestLimitTrigger(null),
    creditShortageTrigger,
    closeCreditShortageDialog: () => setCreditShortageTrigger(null),
  };
}
