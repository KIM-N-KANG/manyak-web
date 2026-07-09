'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { getGetMyChatsQueryKey } from '@/api/generated/endpoints/users/users';
import { ConfirmAlertDialog } from '@/components/common/confirm-alert-dialog';
import { CreditShortageDialog } from '@/components/common/credit-shortage-dialog';
import { FadeStateSwitch } from '@/components/common/fade-state-switch';
import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { LoginRequiredDialog } from '@/features/auth/login-required/components/login-required-dialog';
import { resolvePaymentRequiredReason } from '@/features/auth/login-required/utils/guest-limit-error';
import {
  incrementGuestUsage,
  isGuestOverLimit,
} from '@/features/auth/login-required/utils/guest-usage-storage';
import { CHATS_BATCH_QUERY_KEY } from '@/features/chats/list/hooks/use-created-chats';
import type {
  CreditShortageTrigger,
  GuestLimitTrigger,
} from '@/observability/analytics';
import { track, useTrackOnView } from '@/observability/analytics';

import { useChatComposer } from '../hooks/use-chat-composer';
import { useChatDetail } from '../hooks/use-chat-detail';
import {
  type ChatInputMode,
  useChatInputMode,
} from '../hooks/use-chat-input-mode';
import { useChatStream } from '../hooks/use-chat-stream';
import { ChatRoomHeader } from './header/chat-room-header';
import { ChatInput } from './input/chat-input';
import { ChatMessages } from './messages/chat-messages';

type ChatRoomProps = {
  chatId: string;
};

export function ChatRoom({ chatId }: ChatRoomProps) {
  const queryClient = useQueryClient();
  const { status: sessionStatus } = useSession();
  const [guestLimitTrigger, setGuestLimitTrigger] =
    useState<GuestLimitTrigger | null>(null);
  const [creditShortageTrigger, setCreditShortageTrigger] =
    useState<CreditShortageTrigger | null>(null);

  // 402 통지: 게스트 체험 한도면 로그인 유도, 회원 크레딧 부족이면 크레딧 획득 유도, 그 외는 실패 토스트.
  // 사유는 응답 바디 code로 구분하고(백엔드 KNK-524), code가 없으면 세션 상태로 폴백한다.
  const handlePaymentRequired = (error: unknown) => {
    const reason = resolvePaymentRequiredReason(error, sessionStatus);

    if (reason === 'guest-trial-limit') {
      setGuestLimitTrigger('chat_turn');

      return;
    }

    if (reason === 'insufficient-credit') {
      setCreditShortageTrigger('chat_turn');

      return;
    }

    toast.error(TOAST_MESSAGE.RESPONSE_STREAM_FAILED);
  };
  const {
    storyTitle,
    prologue,
    turns,
    suggestedInputs,
    isLoading,
    isError,
    refetch,
  } = useChatDetail(chatId);
  const handleStreamCompleted = async () => {
    if (sessionStatus !== 'authenticated') {
      incrementGuestUsage('chat');
    }

    await refetch();
    // 게스트(배치)·회원(me/chats) 목록 모두 최근 활동 순서가 바뀌므로 함께 무효화한다.
    // 비활성 쿼리 무효화는 무해해서 세션 분기 없이 둘 다 처리한다.
    await queryClient.invalidateQueries({ queryKey: [CHATS_BATCH_QUERY_KEY] });
    await queryClient.invalidateQueries({ queryKey: getGetMyChatsQueryKey() });
  };

  const { streamingTurn, isStreaming, send } = useChatStream(
    chatId,
    turns.length,
    handleStreamCompleted,
    handlePaymentRequired,
  );

  // 게스트가 턴 한도에 도달했으면 전송하지 않고 로그인 유도(서버 402 이전의 클라이언트 사전 차단).
  const guardedSend = (userInput: string): Promise<void> => {
    if (isGuestOverLimit(sessionStatus, 'chat')) {
      setGuestLimitTrigger('chat_turn');

      return Promise.resolve();
    }

    return send(userInput);
  };

  const { mode, changeMode } = useChatInputMode();

  const composer = useChatComposer({
    chatId,
    turnCount: turns.length,
    isStreaming,
    inputMode: mode,
    onSend: guardedSend,
  });

  const [pendingFill, setPendingFill] = useState<{
    text: string;
    position: number;
  } | null>(null);

  const handleFillChoice = (text: string, position: number) => {
    if (composer.hasDraft) {
      setPendingFill({ text, position });

      return;
    }

    composer.fillChoice(text, position);
  };

  const confirmFillChoice = () => {
    if (pendingFill) {
      composer.fillChoice(pendingFill.text, pendingFill.position);
    }

    setPendingFill(null);
  };

  const handleModeChange = (nextMode: ChatInputMode) => {
    if (nextMode !== mode) {
      track('client_chat_inputMode_selected', {
        chat_id: chatId,
        mode: nextMode,
      });
    }

    composer.convertTo(nextMode);
    changeMode(nextMode);
  };

  useTrackOnView('client_chat_viewed', { chat_id: chatId });

  useEffect(() => {
    if (isError) {
      track('client_chat_loadError_shown', { chat_id: chatId });
    }
  }, [isError, chatId]);

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  let stateKey: string;
  let content: ReactNode;

  if (isLoading) {
    stateKey = 'loading';
    content = <PageLoadingSpinner aria-label="채팅을 불러오는 중" />;
  } else if (isError) {
    stateKey = 'error';
    content = (
      <RetryListStatus
        title="채팅을 불러오지 못했어요"
        onRetry={() => {
          track('client_chat_retryButton_clicked', { chat_id: chatId });
          refetch();
        }}
      />
    );
  } else {
    stateKey = 'content';
    content = (
      <>
        <ChatRoomHeader
          chatId={chatId}
          storyTitle={storyTitle}
          isVisible={isHeaderVisible}
          inputMode={mode}
          onInputModeChange={handleModeChange}
        />
        <div className="flex min-h-0 flex-1 flex-col">
          <ChatMessages
            prologue={prologue}
            turns={turns}
            suggestedInputs={suggestedInputs}
            streamingTurn={streamingTurn}
            onSendChoice={composer.sendChoice}
            onFillChoice={handleFillChoice}
            onHeaderVisibleChange={setIsHeaderVisible}
          />
        </div>
        <ChatInput mode={mode} composer={composer} disabled={isStreaming} />
        <ConfirmAlertDialog
          open={pendingFill !== null}
          onOpenChange={(open) => {
            if (!open) {
              setPendingFill(null);
            }
          }}
          onConfirm={confirmFillChoice}
          title="작성 중인 내용을 바꿀까요?"
          description="지금 작성 중인 내용은 사라져요"
          cancelLabel="그대로 두기"
          confirmLabel="바꾸기"
        />
        <LoginRequiredDialog
          trigger={guestLimitTrigger}
          onOpenChange={(open) => {
            if (!open) {
              setGuestLimitTrigger(null);
            }
          }}
        />
        <CreditShortageDialog
          trigger={creditShortageTrigger}
          onOpenChange={(open) => {
            if (!open) {
              setCreditShortageTrigger(null);
            }
          }}
        />
      </>
    );
  }

  return (
    <FadeStateSwitch
      stateKey={stateKey}
      className="relative flex h-full min-h-0 flex-col">
      {content}
    </FadeStateSwitch>
  );
}
