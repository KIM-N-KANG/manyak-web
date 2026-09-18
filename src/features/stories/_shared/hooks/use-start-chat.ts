'use client';

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
import { useLoginRequired } from '@/features/auth/_shared/hooks/use-login-required';
import { saveCreatedChatId } from '@/features/chats/_shared/utils/chat-id-storage';

type UseStartChatOptions = {
  /** 사용할 시작 설정 id(생략 시 백엔드가 첫 설정 사용) */
  startSettingId?: string;
  /** 생성 요청 직전에 호출한다. 진입점별 분석 이벤트는 호출부가 소유한다. */
  onStart?: () => void;
};

/**
 * 스토리로 새 채팅을 시작하는 훅. 스토리 상세 CTA와 채팅방 메뉴가 함께 쓴다.
 * 채팅은 회원 전용이라 생성 요청 전에 회원 여부를 확인하고, 게스트에게는 요청 없이 로그인
 * 시트를 연다. 채팅 생성 후 상세 데이터를 프리페치한 뒤 채팅방으로 이동한다.
 *
 * @param storyId 채팅을 시작할 스토리 id
 * @param options 시작 설정 id와 요청 직전 콜백
 * @returns 채팅 시작 함수와 진행/에러 상태, 로그인 필요 시트 props
 */
export function useStartChat(
  storyId: string,
  { startSettingId, onStart }: UseStartChatOptions = {},
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status } = useSession();
  const { requireLogin, sheetProps } = useLoginRequired();
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
      onError: () => {
        // 채팅 생성은 이프를 소모하지 않으므로 사유 구분 없이 실패 토스트를 띄운다.
        toast.error(TOAST_MESSAGE.CHAT_START_FAILED);
      },
    },
  });

  const startChat = () => {
    if (requireLogin()) {
      return;
    }

    onStart?.();
    createChat.mutate({ data: { storyId, startSettingId } });
  };

  return {
    startChat,
    isStarting: createChat.isPending || createChat.isSuccess,
    isError: createChat.isError,
    loginSheetProps: sheetProps,
  };
}
