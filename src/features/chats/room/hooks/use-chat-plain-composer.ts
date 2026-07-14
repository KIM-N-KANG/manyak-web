import { useRef, useState } from 'react';

import { insertEmphasisMarkers } from '../lib/insert-emphasis-markers';

type UseChatPlainComposerParams = {
  submitText: (text: string) => boolean;
};

/**
 * 일반(자유 텍스트) 입력 모드의 텍스트 상태와 전송·채우기·강조 삽입 동작을 관리하는 훅
 *
 * @param submitText 완성된 텍스트를 전송하고 성공 여부를 반환하는 함수
 * @returns 입력 값과 전송·채우기·초기화·강조 삽입 동작
 */
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
