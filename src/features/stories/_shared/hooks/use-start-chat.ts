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
import { saveCreatedChatId } from '@/features/chats/_shared/utils/chat-id-storage';

type UseStartChatOptions = {
  /** 사용할 시작 설정 id(생략 시 백엔드가 첫 설정 사용) */
  startSettingId?: string;
  /** 생성 요청 직전에 호출한다. 진입점별 분석 이벤트는 호출부가 소유한다. */
  onStart?: () => void;
  /** 채팅 생성에 실패해 토스트를 띄운 뒤 채팅을 만들려던 스토리 id로 호출한다. */
  onError?: (storyId: string) => void;
  /**
   * 채팅방에서 브라우저 뒤로가기로 돌아갈 화면이다. 생략하면 지금 화면을 채팅방으로 바꿔 그 아래 화면으로
   * 돌아간다. 제작을 마친 화면처럼 아래에 끝난 단계가 남는 곳에서 쓴다.
   */
  backTo?: string;
};

/**
 * 스토리로 새 채팅을 시작하는 훅. 스토리 상세 CTA와 채팅방 메뉴가 함께 쓴다.
 * 게스트 채팅은 브라우저 서재에 저장하며 전송 직전에 게스트 동의를 확인한다.
 * 채팅 생성 후 상세 데이터를 프리페치한 뒤 채팅방으로 이동한다.
 *
 * @param storyId 채팅을 시작할 스토리 id
 * @param options 시작 설정 id와 요청 직전·실패 콜백
 * @returns 채팅 시작 함수(호출 시점에야 id를 아는 경우 `startChatFor`)와 진행/에러 상태
 */
export function useStartChat(
  storyId: string,
  { startSettingId, onStart, onError, backTo }: UseStartChatOptions = {},
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status } = useSession();
  const createChat = useCreateChat({
    mutation: {
      onSuccess: async (response) => {
        const chatId = response.status === 201 ? response.data.id : undefined;

        if (!chatId) {
          return;
        }

        // 회원 서재는 서버가 정본 — 게스트로 확정됐을 때만 로컬에 ID를 남긴다.
        if (status === 'unauthenticated') {
          saveCreatedChatId(chatId);
        } else {
          void queryClient.invalidateQueries({
            queryKey: getGetMyChatsQueryKey(),
          });
        }

        await queryClient.prefetchQuery(getGetChatDetailQueryOptions(chatId));

        if (backTo) {
          // 지금 화면을 돌아갈 화면으로 바꾼 뒤 그 위에 채팅방을 쌓는다. 두 이동을 연달아 부르면 Next가
          // 앞의 이동을 버려 히스토리에 남지 않으므로, 바꾼 주소가 반영된 뒤에 채팅방을 쌓는다.
          router.replace(backTo);
          await waitForPathname(backTo);
          router.push(APP_PATH.CHAT_ROOM(chatId));

          return;
        }

        router.replace(APP_PATH.CHAT_ROOM(chatId));
      },
      onError: (_error, variables) => {
        // 채팅 생성은 이프를 소모하지 않으므로 사유 구분 없이 실패 토스트를 띄운다.
        toast.error(TOAST_MESSAGE.CHAT_START_FAILED);
        onError?.(variables.data.storyId ?? storyId);
      },
    },
  });

  const startChatFor = (targetStoryId: string) => {
    onStart?.();
    createChat.mutate({ data: { storyId: targetStoryId, startSettingId } });
  };

  const startChat = () => startChatFor(storyId);

  return {
    startChat,
    startChatFor,
    isStarting: createChat.isPending || createChat.isSuccess,
    isError: createChat.isError,
  };
}

/** 주소가 pathname 이 될 때까지 기다린다. 이동이 늦어도 timeoutMillis 뒤에는 돌려준다. */
async function waitForPathname(pathname: string, timeoutMillis = 5000) {
  const startedAt = performance.now();

  while (
    window.location.pathname !== pathname &&
    performance.now() - startedAt < timeoutMillis
  )
    await new Promise((resolve) => requestAnimationFrame(resolve));
}
