import { track } from '@/observability/analytics';

type UseChatSubmitActionsParams = {
  chatId: string;
  turnCount: number;
  isStreaming: boolean;
  onSend: (text: string) => void;
};

export function useChatSubmitActions({
  chatId,
  turnCount,
  isStreaming,
  onSend,
}: UseChatSubmitActionsParams) {
  const createEventProps = () => ({
    chat_id: chatId,
    turn_number: turnCount + 1,
  });

  const submitText = (text: string) => {
    const trimmed = text.trim();

    if (!trimmed || isStreaming) {
      return false;
    }

    track('client_chat_messageInput_submitted', createEventProps());
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

    return submitText(trimmed);
  };

  return { submitText, submitChoice };
}
