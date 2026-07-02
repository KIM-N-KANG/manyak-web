'use client';

import { useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { RetryListStatus } from '@/components/common/retry-list-status';
import { Spinner } from '@/components/ui/spinner';
import { CHATS_BATCH_QUERY_KEY } from '@/features/chats/list/hooks/use-chats';
import { track, useTrackOnView } from '@/lib/analytics';

import { useChatComposer } from '../hooks/use-chat-composer';
import { useChatDetail } from '../hooks/use-chat-detail';
import { useChatStream } from '../hooks/use-chat-stream';
import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { ChatRoomHeader } from './chat-room-header';

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
    handleStreamCompleted,
  );

  const composer = useChatComposer({
    chatId,
    turnCount: turns.length,
    isStreaming,
    onSend: send,
  });

  useTrackOnView('client_chat_viewed', { chat_id: chatId });

  useEffect(() => {
    if (isError) {
      track('client_chat_loadError_shown', { chat_id: chatId });
    }
  }, [isError, chatId]);

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-8 text-foreground-secondary" />
      </div>
    );
  }

  if (isError) {
    return (
      <RetryListStatus
        title="채팅을 불러오지 못했어요"
        onRetry={() => {
          track('client_chat_retryButton_clicked', { chat_id: chatId });
          refetch();
        }}
      />
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ChatRoomHeader storyTitle={storyTitle} isVisible={isHeaderVisible} />
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatMessages
          prologue={prologue}
          turns={turns}
          suggestedInputs={suggestedInputs}
          streamingTurn={streamingTurn}
          onSendChoice={composer.sendChoice}
          onFillChoice={composer.fillChoice}
          onHeaderVisibleChange={setIsHeaderVisible}
        />
      </div>
      <ChatInput
        value={composer.value}
        onChange={composer.setValue}
        onSend={composer.send}
        onInsertEmphasis={composer.insertEmphasis}
        disabled={isStreaming}
        textareaRef={composer.textareaRef}
      />
    </div>
  );
}
