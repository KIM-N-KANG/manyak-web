'use client';

/**
 * @file 채팅 메시지 목록과 스크롤 처리의 접점.
 *
 * 스크롤은 여러 조각이 나눠 맡는다. 진입 직후에는 `useInitialScrollSettled` 가 추정 높이로 생긴 가짜 맨 끝이
 * 실제 맨 끝으로 정착할 때까지 스크롤러를 숨긴다. 전송하면 MessageScroller가 스트리밍 턴을 앵커로 고정하고,
 * 생성이 끝난 뒤 남는 하단 스페이서는 `useSpacerCollapse` 가 위로 올린 스크롤 여유만큼 회수한다. 확정 턴이
 * 도착한 렌더에서는 `isStreamingTurnSuperseded` 로 스트리밍 블록을 함께 숨겨 높이가 한 프레임 줄어드는 튐을 막는다.
 *
 * @see useInitialScrollSettled
 * @see useSpacerCollapse
 * @see isStreamingTurnSuperseded
 */

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

/** 재생성이나 입력 수정이 시작되면 대상 턴을 뷰포트 위쪽에 맞춰 스크롤하는, 아무것도 그리지 않는 컴포넌트. */
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
  /** 스토리 프롤로그. 빈 문자열이면 그리지 않는다. */
  prologue: string;
  turns: ChatTurnResponse[];
  /** 시작 추천 입력. 확정 턴이 없고 생성 중이 아닐 때만 보인다. */
  suggestedInputs: string[];
  /** 생성 중인 턴. 확정 턴에 이미 대체됐으면 그리지 않는다. */
  streamingTurn: StreamingTurn | null;
  /** 재생성과 입력 수정에서 진행 블록이 대신하는 턴. 그 뒤의 턴은 진행 중에 숨긴다. */
  replacingTurnId: number | null;
  /** 입력을 고치는 중인 턴의 편집기. 그 턴 뒤의 대화는 흐리게 둔다. */
  editor: TurnEditor | null;
  /** 입력 수정과 포크를 막을 때 true다. */
  turnActionsDisabled: boolean;
  /** 선택지 설정. 꺼져 있으면 마지막 턴의 선택지를 그리지 않는다(시작 추천 입력은 그대로 보인다). */
  choicesEnabled: boolean;
  /** 선택지 생성 진행 상태. 같은 `turnId` 의 마지막 턴에 선택지가 없을 때만 보인다. */
  choicesStatus: ChoicesStatus | null;
  /** 첫 추천 입력 목록에 1회성 사용법 힌트를 보여줄지 여부. */
  showsChoicesHint: boolean;
  /** 선택지를 바로 보낸다. `position` 은 0부터 세는 순번, `sourceTurnId` 는 시작 추천 입력이면 없다. */
  onSendChoice: (text: string, position: number, sourceTurnId?: number) => void;
  /** 선택지를 입력창에 채운다. 인자는 `onSendChoice` 와 같다. */
  onFillChoice: (text: string, position: number, sourceTurnId?: number) => void;
  /** 마지막 턴의 응답 재생성을 요청한다. */
  onRegenerate: (turn: ChatTurnResponse) => void;
  /** 턴의 입력 편집기를 연다. */
  onEdit: (turn: ChatTurnResponse) => void;
  /** 이 턴까지를 새 채팅으로 갈라 내도록 요청한다. */
  onFork: (turn: ChatTurnResponse) => void;
  /** 마지막 턴의 선택지 생성을 다시 시도한다. */
  onRetryChoices: () => void;
  /** 본문 이미지를 탭해 뷰어가 열릴 때 호출된다(분석 이벤트용). */
  onCharacterImageZoom: () => void;
  /** 메시지 영역의 빈 곳을 탭했을 때 호출한다. 입력 중 키보드를 닫으려는 탭은 제외한다. */
  onBackgroundTap: () => void;
};

/**
 * 채팅방의 메시지 목록. 안내 문구, 프롤로그, 확정 턴, 시작 추천 입력, 생성 중인 턴을 MessageScroller에 싣는다.
 *
 * @remarks
 * - 처음부터 빈 채팅이면 맨 위 정렬로 시작하고 초기 정착 숨김을 건너뛴다.
 * - `autoScroll`(꼬리 추적)은 기존 대화에 들어와 아직 보내지 않았을 때만 켠다. 첫 전송부터는 스트리밍 턴의
 *   앵커가 위치를 잡고, 재생성과 입력 수정 중에는 대상 턴을 위쪽에 고정해야 하므로 끈다.
 * - 재생성과 입력 수정 중에는 대상 턴 자리에 스트리밍 턴을 그리고 그 뒤 턴을 숨기며, 브라우저 스크롤 앵커링을 끈다.
 * - 메시지 아이템은 `content-visibility:auto` 로 추정 높이를 쓰지만, 생성 중인 턴과 전송 뒤의 마지막 확정 턴은
 *   실제 높이가 필요해 `visible` 로 둔다.
 */
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
      // 편집기가 열리며 늘어난 높이만큼 꼬리를 따라 내려가면 편집기가 헤더 밑으로 올라가므로 편집 중에는 끈다.
      autoScroll={
        !startedEmpty && !hasSent && replacingTurnId == null && editor == null
      }
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
          className={cn(
            (replacingTurnId != null || editor != null) &&
              '[overflow-anchor:none]',
          )}
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
