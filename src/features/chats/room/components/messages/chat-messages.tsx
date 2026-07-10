'use client';

import { type UIEvent, useEffect, useRef, useState } from 'react';

import type { ChatTurnResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import { CHAT_HEADER_HEIGHT_CLASS } from '../../constants';
import { resolveHeaderVisibility } from '../../lib/resolve-header-visibility';
import type { StreamingTurn } from '../../types';
import { AiMessageBubble } from '../message-content/chat-message-bubble';
import { ChatChoices } from './chat-choices';
import { ChatStreamingTurn } from './chat-streaming-turn';
import { ChatTurnItem } from './chat-turn-item';

type ChatMessagesProps = {
  prologue: string;
  turns: ChatTurnResponse[];
  suggestedInputs: string[];
  streamingTurn: StreamingTurn | null;
  onSendChoice: (text: string, position: number) => void;
  onFillChoice: (text: string, position: number) => void;
  onHeaderVisibleChange: (isVisible: boolean) => void;
};

export function ChatMessages({
  prologue,
  turns,
  suggestedInputs,
  streamingTurn,
  onSendChoice,
  onFillChoice,
  onHeaderVisibleChange,
}: ChatMessagesProps) {
  const [startedEmpty] = useState(() => turns.length === 0 && !streamingTurn);
  const [hasSent, setHasSent] = useState(false);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    if (streamingTurn && !hasSent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasSent(true);
    }
  }, [streamingTurn, hasSent]);

  const handleViewportScroll = (event: UIEvent<HTMLDivElement>) => {
    const current = event.currentTarget.scrollTop;
    const delta = current - lastScrollTopRef.current;
    const nextVisible = resolveHeaderVisibility(current, delta);

    if (nextVisible !== null) {
      onHeaderVisibleChange(nextVisible);
    }

    lastScrollTopRef.current = current;
  };

  const lastTurnIndex = turns.length - 1;

  return (
    <MessageScrollerProvider
      autoScroll={!startedEmpty && !hasSent}
      defaultScrollPosition={startedEmpty ? 'start' : 'end'}
      scrollPreviousItemPeek={0}>
      <MessageScroller>
        <MessageScrollerViewport onScroll={handleViewportScroll}>
          <MessageScrollerContent className="gap-0">
            <div
              aria-hidden
              className={cn('shrink-0', CHAT_HEADER_HEIGHT_CLASS)}
            />

            {prologue ? (
              <MessageScrollerItem>
                <AiMessageBubble>{prologue}</AiMessageBubble>
              </MessageScrollerItem>
            ) : null}

            {turns.map((turn, index) => {
              const isLast = !streamingTurn && index === lastTurnIndex;

              return (
                <MessageScrollerItem key={turn.id ?? index}>
                  <ChatTurnItem
                    turn={turn}
                    isLast={isLast}
                    onSendChoice={onSendChoice}
                    onFillChoice={onFillChoice}
                  />
                </MessageScrollerItem>
              );
            })}

            {turns.length === 0 && !streamingTurn ? (
              <MessageScrollerItem>
                <ChatChoices
                  choices={suggestedInputs}
                  onSend={onSendChoice}
                  onFill={onFillChoice}
                />
              </MessageScrollerItem>
            ) : null}

            {streamingTurn ? (
              <MessageScrollerItem scrollAnchor>
                <ChatStreamingTurn turn={streamingTurn} />
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        {streamingTurn ? (
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            disabled
            aria-label="AI 응답 생성 중"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 border-border bg-background text-foreground disabled:opacity-100">
            <Spinner />
          </Button>
        ) : (
          <MessageScrollerButton aria-label="맨 아래로 이동" />
        )}
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
