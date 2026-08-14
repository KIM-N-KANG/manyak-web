import { useRef } from 'react';

import type { ContinueChatRequestUserSource } from '@/api/generated/models';
import { track } from '@/observability/analytics';

import type { ChatChoiceSelection } from '../types';
import { createChoiceSelection } from '../utils/create-choice-selection';
import { parseInputBlocks, serializeInputBlocks } from '../utils/input-blocks';
import { resolveUserSource } from '../utils/resolve-user-source';
import { type ChatInputMode } from './use-chat-input-mode';

type FilledChoice = {
  text: string;
  position: number;
  sourceTurnId?: number;
};

type UseChatSubmitActionsParams = {
  chatId: string;
  turnCount: number;
  isStreaming: boolean;
  inputMode: ChatInputMode;
  onSend: (
    text: string,
    userSource: ContinueChatRequestUserSource,
    selection?: ChatChoiceSelection,
  ) => void;
};

/**
 * 채팅 입력 전송 동작을 제공하는 훅.
 * 공백/스트리밍 중 전송을 막고 분석 이벤트를 기록한 뒤 `onSend`를 호출한다.
 *
 * @param chatId 대상 채팅 ID
 * @param turnCount 현재까지의 턴 개수
 * @param isStreaming 응답 스트리밍 진행 여부
 * @param inputMode 현재 입력 모드(일반/블럭)
 * @param onSend 완성된 텍스트와 그 출처를 전송하는 콜백
 * @returns 텍스트·선택지 전송과 채우기 트래킹 동작
 */
export function useChatSubmitActions({
  chatId,
  turnCount,
  isStreaming,
  inputMode,
  onSend,
}: UseChatSubmitActionsParams) {
  // 채우기로 입력창에 넣어둔 선택지 원문·위치·턴 ID다. 전송 시점에 현재 텍스트와
  // 대조해 출처를 가르고, 서버가 선택 결과를 기록할 메타데이터를 함께 만든다.
  // 화면에 그리는 값이 아니라 다음 전송까지 들고만 있으면 되므로 ref로 둔다.
  const filledChoiceRef = useRef<FilledChoice | null>(null);

  const createEventProps = () => ({
    chat_id: chatId,
    turn_number: turnCount + 1,
  });

  const submitText = (
    text: string,
    source: 'block' | 'plain' | 'choice' = inputMode,
    selectedChoice?: FilledChoice,
  ) => {
    const trimmed = text.trim();

    if (!trimmed || isStreaming) {
      return false;
    }

    // 선택지를 눌러 바로 보낸 경로는 대조할 것도 없이 choice다.
    const userSource =
      source === 'choice'
        ? 'choice'
        : resolveUserSource({
            filledChoiceText: filledChoiceRef.current?.text ?? null,
            submittedText: trimmed,
          });
    const choice = selectedChoice ?? filledChoiceRef.current;
    const selection = choice
      ? createChoiceSelection(choice.sourceTurnId, choice.position)
      : undefined;

    track('client_chat_messageInput_submitted', {
      ...createEventProps(),
      input_mode: source,
    });
    onSend(trimmed, userSource, selection);

    // 다음 입력이 앞 턴에서 채운 선택지와 대조되지 않도록 전송에 성공하면 비운다.
    filledChoiceRef.current = null;

    return true;
  };

  const submitChoice = (
    text: string,
    position: number,
    sourceTurnId?: number,
  ) => {
    const trimmed = text.trim();

    if (!trimmed || isStreaming) {
      return false;
    }

    track('client_chat_choiceOption_selected', {
      ...createEventProps(),
      position,
    });

    // 블럭 입력과 동일하게 상황(*...*)·대사를 빈 줄로 띄워 전송한다.
    const normalized = serializeInputBlocks(parseInputBlocks(trimmed), '\n\n');

    return submitText(normalized, 'choice', {
      text: trimmed,
      position,
      sourceTurnId,
    });
  };

  const trackChoiceFill = (position: number) => {
    track('client_chat_choiceFillButton_clicked', {
      ...createEventProps(),
      position,
    });
  };

  /** 채우기로 입력창에 넣은 추천 선택지 원문을 전송 시점 대조용으로 기억한다. */
  const rememberFilledChoice = (
    text: string,
    position: number,
    sourceTurnId?: number,
  ) => {
    filledChoiceRef.current = { text, position, sourceTurnId };
  };

  return { submitText, submitChoice, trackChoiceFill, rememberFilledChoice };
}
