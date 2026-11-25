import { useRef } from 'react';

import type { ContinueChatRequestUserSource } from '@/api/generated/models';
import { track } from '@/observability/analytics';

import type { ChatChoiceSelection } from '../types';
import { createChoiceSelection } from '../utils/create-choice-selection';
import { parseInputBlocks, serializeInputBlocks } from '../utils/input-blocks';
import { resolveUserSource } from '../utils/resolve-user-source';
import { type ChatInputMode } from './use-chat-input-mode';

type FilledChoice = {
  /** 입력창에 채운 선택지 원문(trim 전). 전송 시점의 입력과 대조해 출처를 가른다. */
  text: string;
  /** 선택지 목록 안의 0부터 세는 순번. 서버에는 1부터 세는 `choiceOrder` 로 바꿔 보낸다. */
  position: number;
  /** 선택지가 달린 턴 ID. 없으면 선택 메타데이터를 보내지 않는다. */
  sourceTurnId?: number;
};

type UseChatSubmitActionsParams = {
  chatId: string;
  turnCount: number;
  isStreaming: boolean;
  inputMode: ChatInputMode;
  /** 전송 직전 추가 차단 조건. false를 돌려주면 입력을 비우지 않고 전송하지 않는다. */
  canSend?: () => boolean | Promise<boolean>;
  onSend: (
    text: string,
    userSource: ContinueChatRequestUserSource,
    selection?: ChatChoiceSelection,
  ) => void;
};

/**
 * 채팅 입력 전송 동작을 제공하는 훅.
 * 공백/스트리밍 중 전송을 막고 분석 이벤트를 기록한 뒤 `onSend`를 호출한다.
 * `canSend`가 false면(비로그인 등) 전송하지 않고 false를 돌려줘 컴포저가 입력을 유지한다.
 *
 * @param chatId 대상 채팅 ID
 * @param turnCount 현재까지의 턴 개수
 * @param isStreaming 응답 스트리밍 진행 여부
 * @param inputMode 현재 입력 모드(일반/블럭)
 * @param canSend 전송 직전 추가 차단 조건(생략 시 항상 허용)
 * @param onSend 완성된 텍스트와 그 출처를 전송하는 콜백
 * @returns 텍스트·선택지 전송과 채우기 트래킹 동작
 */
export function useChatSubmitActions({
  chatId,
  turnCount,
  isStreaming,
  inputMode,
  canSend,
  onSend,
}: UseChatSubmitActionsParams) {
  // 채우기로 입력창에 넣어둔 선택지 원문·위치·턴 ID다. 전송 시점에 현재 텍스트와
  // 대조해 출처를 가르고, 서버가 선택 결과를 기록할 메타데이터를 함께 만든다.
  // 화면에 그리는 값이 아니라 다음 전송까지 들고만 있으면 되므로 ref로 둔다.
  const filledChoiceRef = useRef<FilledChoice | null>(null);
  const submittingRef = useRef(false);

  const createEventProps = () => ({
    chat_id: chatId,
    turn_number: turnCount + 1,
  });

  /**
   * 입력을 다듬어 전송한다. 앞선 전송이 `canSend` 를 기다리는 동안 다시 불리면 무시한다.
   *
   * @param text 보낼 원문. 앞뒤 공백을 지운 값을 보낸다
   * @param source 분석 이벤트의 입력 경로. 생략하면 현재 입력 모드이고, `choice` 면 대조 없이 선택지 출처로 본다
   * @param selectedChoice 선택지를 바로 보낸 경우의 선택지. 없으면 채우기로 기억한 선택지를 쓴다
   * @returns 전송했으면 true. 빈 입력, 생성 중, 중복 호출, `canSend` 거절이면 false이고 컴포저는 입력을 유지한다
   */
  const submitText = async (
    text: string,
    source: 'block' | 'plain' | 'choice' = inputMode,
    selectedChoice?: FilledChoice,
  ) => {
    const trimmed = text.trim();

    if (!trimmed || isStreaming || submittingRef.current) {
      return false;
    }

    submittingRef.current = true;

    try {
      if ((await canSend?.()) === false) return false;

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
    } finally {
      submittingRef.current = false;
    }
  };

  /**
   * 선택지를 블럭 입력과 같은 형식(상황과 대사를 빈 줄로 구분)으로 맞춰 바로 전송한다.
   *
   * @returns 전송했으면 true, 빈 선택지나 생성 중, `submitText` 가 막았으면 false
   */
  const submitChoice = async (
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
