'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { getGetMyChatsQueryKey } from '@/api/generated/endpoints/users/users';
import type { ChatTurnResponse } from '@/api/generated/models';
import { ConfirmAlertDialog } from '@/components/common/confirm-alert-dialog';
import { CreditShortageDialog } from '@/components/common/credit-shortage-dialog';
import { FadeStateSwitch } from '@/components/common/fade-state-switch';
import { ListStatus } from '@/components/common/list-status';
import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { LoginRequiredDialog } from '@/features/auth/_shared/components/login-required-dialog';
import { resolvePaymentRequiredReason } from '@/features/auth/_shared/utils/guest-limit-error';
import {
  incrementGuestUsage,
  isGuestOverLimit,
} from '@/features/auth/_shared/utils/guest-usage-storage';
import { CHATS_BATCH_QUERY_KEY } from '@/features/chats/list/hooks/use-created-chats';
import type {
  CreditShortageTrigger,
  GuestLimitTrigger,
} from '@/observability/analytics';
import { track, useTrackOnView } from '@/observability/analytics';

import { useChatChoices } from '../hooks/use-chat-choices';
import { useChatComposer } from '../hooks/use-chat-composer';
import { useChatDetail } from '../hooks/use-chat-detail';
import {
  type ChatInputMode,
  useChatInputMode,
} from '../hooks/use-chat-input-mode';
import { useChatStream } from '../hooks/use-chat-stream';
import { useChoicesToggle } from '../hooks/use-choices-toggle';
import { shouldGenerateChoices } from '../utils/should-generate-choices';
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
    isForbidden,
    refetch,
  } = useChatDetail(chatId);
  const { enabled: choicesEnabled, setEnabled: setChoicesEnabled } =
    useChoicesToggle();
  const { choicesStatus, generate: generateChoicesForTurn } = useChatChoices(
    chatId,
    refetch,
  );
  const handleStreamCompleted = async () => {
    if (sessionStatus !== 'authenticated') {
      incrementGuestUsage('chat');
    }

    const result = await refetch();

    await queryClient.invalidateQueries({ queryKey: [CHATS_BATCH_QUERY_KEY] });
    await queryClient.invalidateQueries({ queryKey: getGetMyChatsQueryKey() });

    const detail = result.data?.status === 200 ? result.data.data : undefined;
    const lastTurn = (detail?.turns as ChatTurnResponse[] | undefined)?.at(-1);

    if (
      lastTurn?.id != null &&
      shouldGenerateChoices({
        enabled: choicesEnabled,
        isStreaming: false,
        lastTurn,
      })
    ) {
      void generateChoicesForTurn(lastTurn.id);
    }
  };

  const { streamingTurn, isStreaming, send, regenerate, regeneratingTurnId } =
    useChatStream(
      chatId,
      turns.length,
      handleStreamCompleted,
      handlePaymentRequired,
      refetch,
    );

  const guardedSend = (userInput: string): Promise<void> => {
    if (isGuestOverLimit(sessionStatus, 'chat')) {
      setGuestLimitTrigger('chat_turn');

      return Promise.resolve();
    }

    return send(userInput);
  };

  const guardedRegenerate = (turn: ChatTurnResponse): Promise<void> => {
    track('client_chat_regenerateButton_clicked', {
      chat_id: chatId,
      turn_number: turns.length,
    });

    if (isGuestOverLimit(sessionStatus, 'chat')) {
      setGuestLimitTrigger('chat_turn');

      return Promise.resolve();
    }

    return regenerate(turn);
  };

  const { mode, changeMode } = useChatInputMode();
  const suggestions =
    turns.length === 0 ? suggestedInputs : (turns.at(-1)?.choices ?? []);

  const composer = useChatComposer({
    chatId,
    turnCount: turns.length,
    isStreaming,
    inputMode: mode,
    suggestions,
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

  const handleChoicesEnabledChange = (next: boolean) => {
    if (next === choicesEnabled) {
      return;
    }

    track('client_chat_choicesToggle_clicked', {
      chat_id: chatId,
      enabled: next,
    });
    setChoicesEnabled(next);

    const lastTurn = turns.at(-1);

    if (
      next &&
      lastTurn?.id != null &&
      shouldGenerateChoices({ enabled: next, isStreaming, lastTurn })
    ) {
      void generateChoicesForTurn(lastTurn.id);
    }
  };

  const handleRetryChoices = () => {
    const lastTurn = turns.at(-1);

    if (lastTurn?.id != null) {
      void generateChoicesForTurn(lastTurn.id);
    }
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

  let stateKey: string;
  let content: ReactNode;

  if (isLoading) {
    stateKey = 'loading';
    content = <PageLoadingSpinner aria-label="채팅을 불러오는 중" />;
  } else if (isForbidden) {
    stateKey = 'forbidden';
    content = (
      <ListStatus
        title="지금 계정에서는 볼 수 없어요"
        description="로그인 전에 만든 채팅은 로그아웃하면 다시 볼 수 있어요">
        <Button
          nativeButton={false}
          variant="outline"
          size="lg"
          render={<Link href={APP_PATH.MAIN.CHATS} />}>
          채팅 목록으로 가기
        </Button>
      </ListStatus>
    );
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
        <ChatRoomHeader chatId={chatId} storyTitle={storyTitle} />
        <div className="flex min-h-0 flex-1 flex-col">
          <ChatMessages
            prologue={prologue}
            turns={turns}
            suggestedInputs={suggestedInputs}
            streamingTurn={streamingTurn}
            regeneratingTurnId={regeneratingTurnId}
            choicesStatus={choicesStatus}
            onSendChoice={composer.sendChoice}
            onFillChoice={handleFillChoice}
            onRegenerate={guardedRegenerate}
            onRetryChoices={handleRetryChoices}
          />
        </div>
        <ChatInput
          mode={mode}
          onModeChange={handleModeChange}
          composer={composer}
          disabled={isStreaming}
          choicesEnabled={choicesEnabled}
          onChoicesEnabledChange={handleChoicesEnabledChange}
        />
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
