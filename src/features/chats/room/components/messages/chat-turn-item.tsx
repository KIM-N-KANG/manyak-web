import {
  Edit03Icon,
  Refresh04Icon,
  SplitIcon,
} from '@hugeicons/core-free-icons';
import { m } from 'motion/react';

import type { ChatTurnResponse } from '@/api/generated/models';
import { ChatAiMessageContent } from '@/features/chats/_shared/components/chat-ai-message-content';
import {
  AiMessageBubble,
  UserMessageBubble,
} from '@/features/chats/_shared/components/chat-message-bubble';
import { cn } from '@/lib/utils';

import {
  CHAT_FORK_COPY,
  CHAT_REGENERATE_COPY,
  CHAT_TURN_EDIT_COPY,
} from '../../constants';
import type { ChoicesStatus } from '../../hooks/use-chat-choices';
import type { TurnEditor } from '../../types';
import { canRegenerate } from '../../utils/regenerate';
import { ChatChoices } from './chat-choices';
import { ChatChoicesStatus } from './chat-choices-status';
import { ChatTurnEditor } from './chat-turn-editor';
import { TurnActionButton } from './turn-action-button';

type ChatTurnItemProps = {
  turn: ChatTurnResponse;
  isLast: boolean;
  /** 이 턴의 입력을 고치는 중이면 편집기. 아니면 null이다. */
  editor: TurnEditor | null;
  /** 생성 중처럼 입력 수정과 포크를 막을 때 true다. */
  actionsDisabled: boolean;
  choicesEnabled: boolean;
  choicesStatus: ChoicesStatus | null;
  onSendChoice: (text: string, position: number, sourceTurnId?: number) => void;
  onFillChoice: (text: string, position: number, sourceTurnId?: number) => void;
  onRegenerate: (turn: ChatTurnResponse) => void;
  onEdit: (turn: ChatTurnResponse) => void;
  onFork: (turn: ChatTurnResponse) => void;
  onRetryChoices: () => void;
  onCharacterImageZoom: () => void;
};

export function ChatTurnItem({
  turn,
  isLast,
  editor,
  actionsDisabled,
  choicesEnabled,
  choicesStatus,
  onSendChoice,
  onFillChoice,
  onRegenerate,
  onEdit,
  onFork,
  onRetryChoices,
  onCharacterImageZoom,
}: ChatTurnItemProps) {
  const hasId = turn.id != null;
  const showsRegenerate = isLast && canRegenerate(turn);
  const showsFork = hasId && !!turn.aiOutput;

  return (
    <div>
      {editor ? (
        <ChatTurnEditor
          editor={editor}
          original={turn.userInput ?? ''}
          disabled={actionsDisabled}
        />
      ) : turn.userInput ? (
        <UserMessageBubble
          action={
            hasId ? (
              <TurnActionButton
                icon={Edit03Icon}
                label={CHAT_TURN_EDIT_COPY.trigger}
                disabled={actionsDisabled}
                onClick={() => onEdit(turn)}
              />
            ) : undefined
          }>
          {turn.userInput}
        </UserMessageBubble>
      ) : null}
      {/* 고치는 중에는 바뀔 응답을 흐리게 둔다. */}
      <div className={cn('transition-opacity', editor && 'opacity-40')}>
        {turn.aiOutput ? (
          <AiMessageBubble endingName={turn.reachedEnding}>
            <ChatAiMessageContent
              content={turn.aiOutput}
              onCharacterImageZoom={onCharacterImageZoom}
            />
          </AiMessageBubble>
        ) : null}
        {showsRegenerate || showsFork ? (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="-ml-1 flex px-4 pb-5">
            {showsRegenerate ? (
              <TurnActionButton
                icon={Refresh04Icon}
                label={CHAT_REGENERATE_COPY.trigger}
                onClick={() => onRegenerate(turn)}
              />
            ) : null}
            {showsFork ? (
              <TurnActionButton
                icon={SplitIcon}
                label={CHAT_FORK_COPY.trigger}
                disabled={actionsDisabled}
                onClick={() => onFork(turn)}
              />
            ) : null}
          </m.div>
        ) : null}
        {isLast && choicesEnabled && turn.choices && turn.choices.length > 0 ? (
          <ChatChoices
            choices={turn.choices}
            sourceTurnId={turn.id ?? undefined}
            onSend={onSendChoice}
            onFill={onFillChoice}
          />
        ) : isLast &&
          choicesStatus !== null &&
          choicesStatus.turnId === turn.id ? (
          <ChatChoicesStatus
            status={choicesStatus.status}
            onRetry={onRetryChoices}
          />
        ) : null}
      </div>
    </div>
  );
}
