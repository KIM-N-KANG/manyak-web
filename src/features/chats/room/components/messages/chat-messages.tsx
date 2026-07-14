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
  useMessageScroller,
} from '@/components/ui/message-scroller';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import { useInitialScrollSettled } from '../../hooks/use-initial-scroll-settled';
import type { StreamingTurn } from '../../types';
import { AiMessageBubble } from '../message-content/chat-message-bubble';
import { ChatChoices } from './chat-choices';
import { ChatStreamingTurn } from './chat-streaming-turn';
import { ChatTurnItem } from './chat-turn-item';

type RegenerateAnchorProps = {
  turnId: number | null;
};

/**
 * 재생성 시작 시 대상 턴을 전송 앵커와 같은 위치(상단 고정, 이전 아이템 64px 피크)로
 * 1회 스크롤한다. 인플레이스 교체는 아이템 추가가 없어 프리미티브의 자동 앵커가 동작하지
 * 않으므로 명시적으로 호출한다. settling-jump 모드라 꼬리 추적·리앵커 진동이 없다.
 */
function RegenerateAnchor({ turnId }: RegenerateAnchorProps) {
  const { scrollToMessage } = useMessageScroller();

  useEffect(() => {
    if (turnId != null) {
      scrollToMessage(String(turnId), { align: 'start', scrollMargin: 64 });
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

  const lastTurnIndex = turns.length - 1;

  return (
    <MessageScrollerProvider
      // 재생성 중에는 꼬리 추적을 즉시 끈다 — hasSent 효과가 켜지기 전 한 프레임 동안
      // following-bottom 모드의 scrollToEnd가 실행돼 바닥에 붙는 것을 막는다.
      autoScroll={!startedEmpty && !hasSent && regeneratingTurnId == null}
      defaultScrollPosition={startedEmpty ? 'start' : 'end'}
      scrollPreviousItemPeek={64}>
      <RegenerateAnchor turnId={regeneratingTurnId} />
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

            {turns.map((turn, index) => {
              const isLast = !streamingTurn && index === lastTurnIndex;
              // 재생성 중인 턴은 같은 아이템 안에서 스트리밍 블록으로 교체한다(스펙 §3-6 "대체").
              // 아이템을 제거+추가하면 MessageScroller의 동수(same-count) 앵커 경로를 타며
              // 전환 애니메이션 동안 리앵커가 반복돼 스크롤이 상하로 진동한다.
              // error 이벤트로 실패하면 regeneratingTurnId 해제만으로 기존 본문·선택지가 복원된다.
              const isRegenerating =
                streamingTurn !== null &&
                regeneratingTurnId != null &&
                turn.id === regeneratingTurnId;

              return (
                <MessageScrollerItem
                  key={turn.id ?? index}
                  messageId={turn.id != null ? String(turn.id) : undefined}>
                  {isRegenerating ? (
                    <ChatStreamingTurn turn={streamingTurn} />
                  ) : (
                    <ChatTurnItem
                      turn={turn}
                      isLast={isLast}
                      onSendChoice={onSendChoice}
                      onFillChoice={onFillChoice}
                      onRegenerate={onRegenerate}
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

            {streamingTurn && regeneratingTurnId == null ? (
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
