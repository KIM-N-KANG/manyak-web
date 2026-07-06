import type { KeyboardEvent } from 'react';

/**
 * 터치 기기(모바일)에서는 소프트 키보드의 Enter가 줄바꿈이 되어야 하므로
 * 전송 단축키로 취급하지 않는다. 데스크톱(마우스)에서는 Enter로 전송한다.
 */
function isCoarsePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)').matches === true
  );
}

/** 키보드 이벤트가 전송 단축키(Shift 없는 Enter, 조합 입력 중 아님, 데스크톱)인지 판별한다. */
export function isSubmitShortcut(
  event: KeyboardEvent<HTMLTextAreaElement>,
): boolean {
  return (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.nativeEvent.isComposing &&
    !isCoarsePointer()
  );
}

/** 전송 단축키 입력 시 기본 동작(줄바꿈)을 막고, 전송 가능하면 `onSubmit`을 호출한다. */
export function submitOnShortcut(
  event: KeyboardEvent<HTMLTextAreaElement>,
  canSubmit: boolean,
  onSubmit: () => void,
) {
  if (!isSubmitShortcut(event)) {
    return;
  }

  event.preventDefault();

  if (canSubmit) {
    onSubmit();
  }
}
