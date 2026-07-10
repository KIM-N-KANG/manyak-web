'use client';

import { useEffect, useState } from 'react';

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
};

export function ChatMessages({
  prologue,
  turns,
  suggestedInputs,
  streamingTurn,
  onSendChoice,
  onFillChoice,
}: ChatMessagesProps) {
  const [startedEmpty] = useState(() => turns.length === 0 && !streamingTurn);
  const [hasSent, setHasSent] = useState(false);

  useEffect(() => {
    if (streamingTurn && !hasSent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasSent(true);
    }
  }, [streamingTurn, hasSent]);

  const lastTurnIndex = turns.length - 1;

  return (
    <MessageScrollerProvider
      autoScroll={!startedEmpty && !hasSent}
      defaultScrollPosition={startedEmpty ? 'start' : 'end'}
      scrollPreviousItemPeek={0}>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-0">
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
