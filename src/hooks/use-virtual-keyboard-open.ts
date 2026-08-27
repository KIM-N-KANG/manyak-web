'use client';

import { useEffect, useRef, useState } from 'react';

const KEYBOARD_HEIGHT_THRESHOLD = 120;
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/**
 * 요소가 가상 키보드를 여는 텍스트 입력인지 확인한다.
 *
 * @param element 확인할 DOM 요소
 * @returns 텍스트 입력 요소이면 true, 아니면 false
 */
function canOpenVirtualKeyboard(element: Element | null) {
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }

  if (element instanceof HTMLInputElement) {
    return !NON_TEXT_INPUT_TYPES.has(element.type);
  }

  return element instanceof HTMLElement && element.isContentEditable;
}

/**
 * 텍스트 입력 포커스와 뷰포트 축소를 함께 확인해 가상 키보드 상태를 반환한다.
 *
 * @returns 가상 키보드가 열려 있으면 true, 아니면 false
 */
export function useVirtualKeyboardOpen() {
  const [isOpen, setIsOpen] = useState(false);
  const viewportHeightWithoutKeyboardRef = useRef(0);

  useEffect(() => {
    const visualViewport = window.visualViewport;

    const getViewportHeight = () =>
      visualViewport?.height ?? window.innerHeight;

    viewportHeightWithoutKeyboardRef.current = Math.max(
      getViewportHeight(),
      window.innerHeight,
    );

    const updateKeyboardState = () => {
      const currentViewportHeight = getViewportHeight();

      if (!canOpenVirtualKeyboard(document.activeElement)) {
        viewportHeightWithoutKeyboardRef.current = Math.max(
          currentViewportHeight,
          window.innerHeight,
        );
        setIsOpen(false);

        return;
      }

      viewportHeightWithoutKeyboardRef.current = Math.max(
        viewportHeightWithoutKeyboardRef.current,
        window.innerHeight,
      );
      setIsOpen(
        viewportHeightWithoutKeyboardRef.current - currentViewportHeight >=
          KEYBOARD_HEIGHT_THRESHOLD,
      );
    };

    const handleFocusChange = () => {
      requestAnimationFrame(updateKeyboardState);
    };

    visualViewport?.addEventListener('resize', updateKeyboardState);
    window.addEventListener('resize', updateKeyboardState);
    document.addEventListener('focusin', handleFocusChange);

    return () => {
      visualViewport?.removeEventListener('resize', updateKeyboardState);
      window.removeEventListener('resize', updateKeyboardState);
      document.removeEventListener('focusin', handleFocusChange);
    };
  }, []);

  return isOpen;
}
