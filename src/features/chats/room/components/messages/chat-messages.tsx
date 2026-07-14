'use client';

import { useEffect, useRef, useState } from 'react';

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

import { useInitialScrollSettled } from '../../hooks/use-initial-scroll-settled';
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
  regeneratingTurnId: number | null;
  onSendChoice: (text: string, position: number) => void;
  onFillChoice: (text: string, position: number) => void;
  onRegenerate: (turn: ChatTurnResponse) => void;
};

export function ChatMessages({
  prologue,
  turns,
  suggestedInputs,
  streamingTurn,
  regeneratingTurnId,
  onSendChoice,
  onFillChoice,
  onRegenerate,
}: ChatMessagesProps) {
  const [startedEmpty] = useState(() => turns.length === 0 && !streamingTurn);
  const [hasSent, setHasSent] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const settled = useInitialScrollSettled(viewportRef, { skip: startedEmpty });

  useEffect(() => {
    if (streamingTurn && !hasSent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasSent(true);
    }
  }, [streamingTurn, hasSent]);

  // 재생성 중인 턴은 숨긴다 — 스트리밍 블록이 사용자 입력 버블과 새 AI 출력을 대신 렌더한다.
  // error 이벤트로 실패하면 regeneratingTurnId 해제만으로 기존 본문·선택지가 복원된다(스펙 §3-6).
  const visibleTurns =
    regeneratingTurnId == null
      ? turns
      : turns.filter((turn) => turn.id !== regeneratingTurnId);
  const lastTurnIndex = visibleTurns.length - 1;

  return (
    <MessageScrollerProvider
      autoScroll={!startedEmpty && !hasSent}
      defaultScrollPosition={startedEmpty ? 'start' : 'end'}
      scrollPreviousItemPeek={64}>
      <MessageScroller
        className={cn(
          'transition-opacity duration-150',
          !settled && 'opacity-0',
        )}>
        <MessageScrollerViewport ref={viewportRef}>
          <MessageScrollerContent className="gap-0">
            {prologue ? (
              <MessageScrollerItem>
                <AiMessageBubble>{prologue}</AiMessageBubble>
              </MessageScrollerItem>
            ) : null}

            {visibleTurns.map((turn, index) => {
              const isLast = !streamingTurn && index === lastTurnIndex;

              return (
                <MessageScrollerItem key={turn.id ?? index}>
                  <ChatTurnItem
                    turn={turn}
                    isLast={isLast}
                    onSendChoice={onSendChoice}
                    onFillChoice={onFillChoice}
                    onRegenerate={onRegenerate}
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
