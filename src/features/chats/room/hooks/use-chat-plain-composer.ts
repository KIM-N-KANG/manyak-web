import { useRef, useState } from 'react';

import { insertEmphasisMarkers } from '../lib/insert-emphasis-markers';

type UseChatPlainComposerParams = {
  submitText: (text: string) => boolean;
};

export function useChatPlainComposer({
  submitText,
}: UseChatPlainComposerParams) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const focusTextEnd = (text: string) => {
    requestAnimationFrame(() => {
      const element = textareaRef.current;

      if (!element) return;

      element.focus();
      element.setSelectionRange(text.length, text.length);
    });
  };

  const send = () => {
    if (submitText(value)) {
      setValue('');
    }
  };

  const fill = (text: string) => {
    setValue(text);
    focusTextEnd(text);
  };

  const clear = () => setValue('');

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
    fill,
    clear,
    insertEmphasis,
  };
}
