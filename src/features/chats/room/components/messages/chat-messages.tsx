'use client';

import { useEffect, useRef, useState } from 'react';

import type { ChatTurnResponse } from '@/api/generated/models';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from '@/components/ui/message-scroller';
import { cn } from '@/lib/utils';

import type { ChoicesStatus } from '../../hooks/use-chat-choices';
import { useInitialScrollSettled } from '../../hooks/use-initial-scroll-settled';
import { useSpacerCollapse } from '../../hooks/use-spacer-collapse';
import type { StreamingTurn } from '../../types';
import { isStreamingTurnSuperseded } from '../../utils/streaming-turn';
import { AiMessageBubble } from '../message-content/chat-message-bubble';
import { ChatChoices } from './chat-choices';
import { ChatStreamingTurn } from './chat-streaming-turn';
import { ChatTurnItem } from './chat-turn-item';

type RegenerateAnchorProps = {
  turnId: number | null;
};

function RegenerateAnchor({ turnId }: RegenerateAnchorProps) {
  const { scrollToMessage } = useMessageScroller();

  useEffect(() => {
    if (turnId != null) {
      scrollToMessage(String(turnId), { align: 'start' });
    }
  }, [turnId, scrollToMessage]);

  return null;
}

type ChatMessagesProps = {
  prologue: string;
  turns: ChatTurnResponse[];
  suggestedInputs: string[];
  streamingTurn: StreamingTurn | null;
  regeneratingTurnId: number | null;
  choicesEnabled: boolean;
  choicesStatus: ChoicesStatus | null;
  onSendChoice: (text: string, position: number) => void;
  onFillChoice: (text: string, position: number) => void;
  onRegenerate: (turn: ChatTurnResponse) => void;
  onRetryChoices: () => void;
};

export function ChatMessages({
  prologue,
  turns,
  suggestedInputs,
  streamingTurn,
  regeneratingTurnId,
  choicesEnabled,
  choicesStatus,
  onSendChoice,
  onFillChoice,
  onRegenerate,
  onRetryChoices,
}: ChatMessagesProps) {
  const [startedEmpty] = useState(() => turns.length === 0 && !streamingTurn);
  const [hasSent, setHasSent] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const settled = useInitialScrollSettled(viewportRef, { skip: startedEmpty });

  const activeStreamingTurn =
    streamingTurn && !isStreamingTurnSuperseded(streamingTurn, turns.length)
      ? streamingTurn
      : null;

  useSpacerCollapse(viewportRef, streamingTurn !== null);

  useEffect(() => {
    if (streamingTurn && !hasSent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasSent(true);
    }
  }, [streamingTurn, hasSent]);

  const lastTurnIndex = turns.length - 1;

  return (
    <MessageScrollerProvider
      autoScroll={!startedEmpty && !hasSent && regeneratingTurnId == null}
      defaultScrollPosition={startedEmpty ? 'start' : 'end'}
      scrollPreviousItemPeek={0}>
      <RegenerateAnchor turnId={regeneratingTurnId} />
      <MessageScroller
        className={cn(
          'transition-opacity duration-150',
          !settled && 'opacity-0',
        )}>
        <MessageScrollerViewport
          ref={viewportRef}
          className={cn(
            regeneratingTurnId != null && '[overflow-anchor:none]',
          )}>
          <MessageScrollerContent className="gap-0">
            {prologue ? (
              <MessageScrollerItem>
                <AiMessageBubble>{prologue}</AiMessageBubble>
              </MessageScrollerItem>
            ) : null}

            {turns.map((turn, index) => {
              const isLast = !activeStreamingTurn && index === lastTurnIndex;
              const isRegenerating =
                activeStreamingTurn !== null &&
                regeneratingTurnId != null &&
                turn.id === regeneratingTurnId;

              return (
                <MessageScrollerItem
                  key={turn.id ?? index}
                  messageId={turn.id != null ? String(turn.id) : undefined}
                  className={cn(
                    hasSent &&
                      index === lastTurnIndex &&
                      '[content-visibility:visible]',
                  )}>
                  {isRegenerating ? (
                    <ChatStreamingTurn turn={activeStreamingTurn} />
                  ) : (
                    <ChatTurnItem
                      turn={turn}
                      isLast={isLast}
                      choicesEnabled={choicesEnabled}
                      choicesStatus={choicesStatus}
                      onSendChoice={onSendChoice}
                      onFillChoice={onFillChoice}
                      onRegenerate={onRegenerate}
                      onRetryChoices={onRetryChoices}
                    />
                  )}
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

            {activeStreamingTurn && regeneratingTurnId == null ? (
              <MessageScrollerItem
                scrollAnchor
                className="[content-visibility:visible]">
                <ChatStreamingTurn turn={activeStreamingTurn} />
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        <MessageScrollerButton aria-label="맨 아래로 이동" />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
