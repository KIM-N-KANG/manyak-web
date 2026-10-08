import { useLayoutEffect, useRef, useState } from 'react';

import { insertEmphasisMarkers } from '../utils/insert-emphasis-markers';

type UseChatPlainComposerParams = {
  submitText: (text: string) => Promise<boolean>;
  /** 마운트 시 되살릴 입력 본문(로그인 복귀 초안). */
  initialValue?: string;
};

/**
 * 일반(자유 텍스트) 입력 모드의 텍스트 상태와 전송·채우기·강조 삽입 동작을 관리하는 훅
 *
 * @param submitText 완성된 텍스트를 전송하고 성공 여부를 반환하는 함수
 * @param initialValue 마운트 시 되살릴 입력 본문
 * @returns 입력 값과 전송·채우기·초기화·강조 삽입 동작
 */
export function useChatPlainComposer({
  submitText,
  initialValue = '',
}: UseChatPlainComposerParams) {
  const [value, setValue] = useState(initialValue);
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 값이 반영된 직후 커서를 옮겨 다음 입력의 선택 영역을 늦게 덮어쓰지 않는다.
  useLayoutEffect(() => {
    const element = textareaRef.current;

    if (!element || !selection) return;

    element.focus();
    element.setSelectionRange(...selection);
  }, [selection]);

  const send = async () => {
    if (await submitText(value)) {
      setValue((current) => (current === value ? '' : current));
    }
  };

  const fill = (text: string) => {
    setValue(text);
    setSelection([text.length, text.length]);
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
    setSelection([cursorStart, cursorEnd]);
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
