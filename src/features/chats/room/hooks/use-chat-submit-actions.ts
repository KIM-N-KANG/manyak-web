import { track } from '@/observability/analytics';

import { type ChatInputMode } from './use-chat-input-mode';

type UseChatSubmitActionsParams = {
  chatId: string;
  turnCount: number;
  isStreaming: boolean;
  inputMode: ChatInputMode;
  onSend: (text: string) => void;
};

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

    return submitText(trimmed, 'choice');
  };

  const trackChoiceFill = (position: number) => {
    track('client_chat_choiceFillButton_clicked', {
      ...createEventProps(),
      position,
    });
  };

  return { submitText, submitChoice, trackChoiceFill };
}
