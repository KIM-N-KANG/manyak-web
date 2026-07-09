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
  useMessageScroller,
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

export function ChatMessages(props: ChatMessagesProps) {
  // 빈 채팅(프롤로그만)으로 시작하면 최상단, 기존 대화가 있으면 맨 아래에서 시작한다.
  const [startedEmpty] = useState(
    () => props.turns.length === 0 && !props.streamingTurn,
  );

  return (
    <MessageScrollerProvider
      autoScroll
      defaultScrollPosition={startedEmpty ? 'start' : 'end'}>
      <ChatMessagesScroller {...props} startedEmpty={startedEmpty} />
    </MessageScrollerProvider>
  );
}

function ChatMessagesScroller({
  prologue,
  turns,
  suggestedInputs,
  streamingTurn,
  onSendChoice,
  onFillChoice,
  onHeaderVisibleChange,
  startedEmpty,
}: ChatMessagesProps & { startedEmpty: boolean }) {
  const { scrollToEnd } = useMessageScroller();
  const lastScrollTopRef = useRef(0);
  const [hasSent, setHasSent] = useState(false);

  useEffect(() => {
    if (streamingTurn && !hasSent) {
      // 첫 전송 이후부터 마지막 턴 앵커(하단 공간 예약)를 유지한다.
      // 초기 로드부터 앵커를 걸면 spacer가 하단 여백을 만들어 초기 화면이 달라진다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasSent(true);

      if (startedEmpty) {
        scrollToEnd({ behavior: 'smooth' });
      }
    }
  }, [streamingTurn, hasSent, startedEmpty, scrollToEnd]);

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
              <MessageScrollerItem
                key={turn.id ?? index}
                scrollAnchor={isLast && hasSent}>
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
  );
}
