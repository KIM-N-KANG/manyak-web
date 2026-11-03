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
import { ChatAiMessageContent } from '@/features/chats/_shared/components/chat-ai-message-content';
import { AiMessageBubble } from '@/features/chats/_shared/components/chat-message-bubble';
import { CHAT_AI_NOTICE } from '@/features/chats/_shared/constants/ai-notice';
import { cn } from '@/lib/utils';

import type { ChoicesStatus } from '../../hooks/use-chat-choices';
import { useInitialScrollSettled } from '../../hooks/use-initial-scroll-settled';
import { useSpacerCollapse } from '../../hooks/use-spacer-collapse';
import type { StreamingTurn, TurnEditor } from '../../types';
import {
  EDITABLE_SELECTOR,
  isHeaderToggleTap,
} from '../../utils/header-toggle-tap';
import { isStreamingTurnSuperseded } from '../../utils/streaming-turn';
import { ChatChoices } from './chat-choices';
import { ChatStreamingTurn } from './chat-streaming-turn';
import { ChatTurnItem } from './chat-turn-item';

type ReplacingTurnAnchorProps = {
  turnId: number | null;
};

function ReplacingTurnAnchor({ turnId }: ReplacingTurnAnchorProps) {
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
  /** 재생성과 입력 수정에서 진행 블록이 대신하는 턴. 그 뒤의 턴은 진행 중에 숨긴다. */
  replacingTurnId: number | null;
  /** 입력을 고치는 중인 턴의 편집기. 그 턴 뒤의 대화는 흐리게 둔다. */
  editor: TurnEditor | null;
  /** 입력 수정과 포크를 막을 때 true다. */
  turnActionsDisabled: boolean;
  choicesEnabled: boolean;
  choicesStatus: ChoicesStatus | null;
  /** 첫 추천 입력 목록에 1회성 사용법 힌트를 보여줄지 여부. */
  showsChoicesHint: boolean;
  onSendChoice: (text: string, position: number, sourceTurnId?: number) => void;
  onFillChoice: (text: string, position: number, sourceTurnId?: number) => void;
  onRegenerate: (turn: ChatTurnResponse) => void;
  onEdit: (turn: ChatTurnResponse) => void;
  onFork: (turn: ChatTurnResponse) => void;
  onRetryChoices: () => void;
  onCharacterImageZoom: () => void;
  /** 메시지 영역의 빈 곳을 탭했을 때 호출한다. 입력 중 키보드를 닫으려는 탭은 제외한다. */
  onBackgroundTap: () => void;
};

export function ChatMessages({
  prologue,
  turns,
  suggestedInputs,
  streamingTurn,
  replacingTurnId,
  editor,
  turnActionsDisabled,
  choicesEnabled,
  choicesStatus,
  showsChoicesHint,
  onSendChoice,
  onFillChoice,
  onRegenerate,
  onEdit,
  onFork,
  onRetryChoices,
  onCharacterImageZoom,
  onBackgroundTap,
}: ChatMessagesProps) {
  const [startedEmpty] = useState(() => turns.length === 0 && !streamingTurn);
  const [hasSent, setHasSent] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const wasEditingRef = useRef(false);
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
  const replacingIndex =
    activeStreamingTurn && replacingTurnId != null
      ? turns.findIndex((turn) => turn.id === replacingTurnId)
      : -1;
  const editingIndex = editor
    ? turns.findIndex((turn) => turn.id === editor.turnId)
    : -1;

  return (
    <MessageScrollerProvider
      autoScroll={!startedEmpty && !hasSent && replacingTurnId == null}
      defaultScrollPosition={startedEmpty ? 'start' : 'end'}
      scrollPreviousItemPeek={0}>
      <ReplacingTurnAnchor turnId={replacingTurnId} />
      <MessageScroller
        className={cn(
          'transition-opacity duration-150',
          !settled && 'opacity-0',
        )}>
        <MessageScrollerViewport
          ref={viewportRef}
          className={cn(replacingTurnId != null && '[overflow-anchor:none]')}
          onPointerDown={() => {
            wasEditingRef.current =
              document.activeElement?.matches(EDITABLE_SELECTOR) ?? false;
          }}
          onClick={(event) => {
            if (!wasEditingRef.current && isHeaderToggleTap(event.target)) {
              onBackgroundTap();
            }
          }}>
          <MessageScrollerContent className="gap-0 pt-(--chat-header-height)">
            <MessageScrollerItem>
              <p className="px-4 text-center text-xs text-foreground-secondary">
                {CHAT_AI_NOTICE}
              </p>
            </MessageScrollerItem>
            {prologue ? (
              <MessageScrollerItem>
                <AiMessageBubble>
                  <ChatAiMessageContent content={prologue} />
                </AiMessageBubble>
              </MessageScrollerItem>
            ) : null}

            {turns.map((turn, index) => {
              // 입력 수정이 끝나면 대상 턴부터 새 턴 하나로 바뀌므로 진행 중에는 뒤의 턴을 숨긴다.
              if (replacingIndex !== -1 && index > replacingIndex) return null;

              const isLast = !activeStreamingTurn && index === lastTurnIndex;

              return (
                <MessageScrollerItem
                  key={turn.id ?? index}
                  messageId={turn.id != null ? String(turn.id) : undefined}
                  className={cn(
                    'transition-opacity',
                    hasSent &&
                      index === lastTurnIndex &&
                      '[content-visibility:visible]',
                    editingIndex !== -1 && index > editingIndex && 'opacity-40',
                  )}>
                  {activeStreamingTurn && index === replacingIndex ? (
                    <ChatStreamingTurn
                      turn={activeStreamingTurn}
                      onCharacterImageZoom={onCharacterImageZoom}
                    />
                  ) : (
                    <ChatTurnItem
                      turn={turn}
                      isLast={isLast}
                      editor={index === editingIndex ? editor : null}
                      actionsDisabled={turnActionsDisabled}
                      choicesEnabled={choicesEnabled}
                      choicesStatus={choicesStatus}
                      onSendChoice={onSendChoice}
                      onFillChoice={onFillChoice}
                      onRegenerate={onRegenerate}
                      onEdit={onEdit}
                      onFork={onFork}
                      onRetryChoices={onRetryChoices}
                      onCharacterImageZoom={onCharacterImageZoom}
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
                  showsHint={showsChoicesHint}
                />
              </MessageScrollerItem>
            ) : null}

            {activeStreamingTurn && replacingTurnId == null ? (
              <MessageScrollerItem
                scrollAnchor
                className="[content-visibility:visible]">
                <ChatStreamingTurn
                  turn={activeStreamingTurn}
                  onCharacterImageZoom={onCharacterImageZoom}
                />
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        <MessageScrollerButton aria-label="맨 아래로 이동" />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
