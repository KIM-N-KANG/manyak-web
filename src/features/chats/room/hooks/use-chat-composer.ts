import { useRef, useState } from 'react';

import { track } from '@/observability/analytics';

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

  const submit = (text: string) => {
    track('client_chat_messageInput_submitted', {
      chat_id: chatId,
      turn_number: turnCount + 1,
    });
    onSend(text);
  };

  const send = () => {
    const text = value.trim();

    if (!text || isStreaming) return;

    setValue('');
    submit(text);
  };

  const sendChoice = (text: string, position: number) => {
    const trimmed = text.trim();

    if (!trimmed || isStreaming) return;

    track('client_chat_choiceOption_selected', {
      chat_id: chatId,
      turn_number: turnCount + 1,
      position,
    });
    setValue('');
    submit(trimmed);
  };

  const fillChoice = (text: string) => {
    setValue(text);
    requestAnimationFrame(() => {
      const element = textareaRef.current;

      if (!element) return;

      element.focus();
      element.setSelectionRange(text.length, text.length);
    });
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

  return {
    value,
    setValue,
    textareaRef,
    send,
    sendChoice,
    fillChoice,
    insertEmphasis,
  };
}
