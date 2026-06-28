import { useRef, useState } from 'react';

import { track } from '@/lib/analytics';

import { insertEmphasisMarkers } from '../lib/insert-emphasis-markers';

type UseChatComposerParams = {
  chatId: string;
  turnCount: number;
  isStreaming: boolean;
  onSend: (text: string) => void;
};

export function useChatComposer({
  chatId,
  turnCount,
  isStreaming,
  onSend,
}: UseChatComposerParams) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    const text = value.trim();

    if (!text || isStreaming) return;

    track('client_chat_messageInput_submitted', {
      chat_id: chatId,
      turn_number: turnCount + 1,
    });
    setValue('');
    onSend(text);
  };

  const pickChoice = (text: string, position: number) => {
    track('client_chat_choiceOption_selected', {
      chat_id: chatId,
      turn_number: turnCount + 1,
      position,
    });
    setValue(text);
  };

  const insertEmphasis = () => {
    const element = textareaRef.current;

    if (!element) return;

    const {
      value: nextValue,
      cursorStart,
      cursorEnd,
    } = insertEmphasisMarkers(
      value,
      element.selectionStart,
      element.selectionEnd,
    );

    setValue(nextValue);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  return { value, setValue, textareaRef, send, pickChoice, insertEmphasis };
}
