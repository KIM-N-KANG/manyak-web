'use client';

import { useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { ListStatus } from '@/components/common/list-status';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { CHATS_BATCH_QUERY_KEY } from '@/features/chats/list/hooks/use-chats';
import { ONBOARDING_TOURS } from '@/features/onboarding/constants';
import { useStartOnboarding } from '@/features/onboarding/hooks/use-onboarding-tour';
import { track } from '@/lib/analytics';

import { useChatDetail } from '../hooks/use-chat-detail';
import { useChatStream } from '../hooks/use-chat-stream';
import { insertEmphasisMarkers } from '../lib/insert-emphasis-markers';
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
  const { streamingTurn, isStreaming, send } = useChatStream(
    chatId,
    async () => {
      await refetch();
      await queryClient.invalidateQueries({
        queryKey: [CHATS_BATCH_QUERY_KEY],
      });
    },
  );

  useStartOnboarding(ONBOARDING_TOURS.CHAT, !isLoading && !isError);

  useEffect(() => {
    track('client_chat_viewed', { chat_id: chatId });
  }, [chatId]);

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-8 text-foreground-secondary" />
      </div>
    );
  }

  if (isError) {
    return (
      <ListStatus
        title="채팅을 불러오지 못했어요"
        description="잠시 후 다시 시도해주세요">
        <Button variant="outline" size="lg" onClick={() => refetch()}>
          다시 시도
        </Button>
      </ListStatus>
    );
  }

  const handleSend = () => {
    const text = value.trim();

    if (!text || isStreaming) return;

    track('client_chat_messageInput_submitted', {
      chat_id: chatId,
      turn_number: turns.length + 1,
    });
    setValue('');
    void send(text);
  };

  const handlePickChoice = (text: string, position: number) => {
    track('client_chat_choiceOption_selected', {
      chat_id: chatId,
      turn_number: turns.length + 1,
      position,
    });
    setValue(text);
  };

  const handleInsertEmphasis = () => {
    const element = textareaRef.current;

    if (!element) return;

    const {
      value: nextValue,
      cursorStart,
      cursorEnd,
    } = insertEmphasisMarkers(
      value,
      element.selectionStart,
      element.selectionEnd,
    );

    setValue(nextValue);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const handleChange = (next: string) => {
    setValue(next);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ChatRoomHeader storyTitle={storyTitle} isVisible={isHeaderVisible} />
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatMessages
          prologue={prologue}
          turns={turns}
          suggestedInputs={suggestedInputs}
          streamingTurn={streamingTurn}
          onPickChoice={handlePickChoice}
          onHeaderVisibleChange={setIsHeaderVisible}
        />
      </div>
      <ChatInput
        value={value}
        onChange={handleChange}
        onSend={handleSend}
        onInsertEmphasis={handleInsertEmphasis}
        disabled={isStreaming}
        textareaRef={textareaRef}
      />
    </div>
  );
}
