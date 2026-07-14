import { track } from '@/observability/analytics';

import { parseInputBlocks, serializeInputBlocks } from '../lib/input-blocks';
import { type ChatInputMode } from './use-chat-input-mode';

type UseChatSubmitActionsParams = {
  chatId: string;
  turnCount: number;
  isStreaming: boolean;
  inputMode: ChatInputMode;
  onSend: (text: string) => void;
};

/**
 * 채팅 입력 전송 동작을 제공하는 훅.
 * 공백/스트리밍 중 전송을 막고 분석 이벤트를 기록한 뒤 `onSend`를 호출한다.
 *
 * @param chatId 대상 채팅 ID
 * @param turnCount 현재까지의 턴 개수
 * @param isStreaming 응답 스트리밍 진행 여부
 * @param inputMode 현재 입력 모드(일반/블럭)
 * @param onSend 완성된 텍스트를 전송하는 콜백
 * @returns 텍스트·선택지 전송과 채우기 트래킹 동작
 */
export function useChatSubmitActions({
  chatId,
  turnCount,
  isStreaming,
  inputMode,
  onSend,
}: UseChatSubmitActionsParams) {
  const createEventProps = () => ({
    chat_id: chatId,
    turn_number: turnCount + 1,
  });

  const submitText = (
    text: string,
    source: 'block' | 'plain' | 'choice' = inputMode,
  ) => {
    const trimmed = text.trim();

    if (!trimmed || isStreaming) {
      return false;
    }

    track('client_chat_messageInput_submitted', {
      ...createEventProps(),
      input_mode: source,
    });
    onSend(trimmed);

    return true;
  };

  const submitChoice = (text: string, position: number) => {
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

    return submitText(normalized, 'choice');
  };

  const trackChoiceFill = (position: number) => {
    track('client_chat_choiceFillButton_clicked', {
      ...createEventProps(),
      position,
    });
  };

  return { submitText, submitChoice, trackChoiceFill };
}
