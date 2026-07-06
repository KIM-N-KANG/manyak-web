'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { ConfirmAlertDialog } from '@/components/common/confirm-alert-dialog';
import { FadeStateSwitch } from '@/components/common/fade-state-switch';
import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { CHATS_BATCH_QUERY_KEY } from '@/features/chats/list/hooks/use-created-chats';
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
    await refetch();
    await queryClient.invalidateQueries({ queryKey: [CHATS_BATCH_QUERY_KEY] });
  };

  const { streamingTurn, isStreaming, send } = useChatStream(
    chatId,
    turns.length,
    handleStreamCompleted,
  );

  const { mode, changeMode } = useChatInputMode();

  const composer = useChatComposer({
    chatId,
    turnCount: turns.length,
    isStreaming,
    inputMode: mode,
    onSend: send,
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
