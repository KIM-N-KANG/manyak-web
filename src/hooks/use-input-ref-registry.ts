import { useRef } from 'react';

type FocusInputOptions = {
  /** 포커스 후 인풋이 화면 중앙에 오도록 부드럽게 스크롤한다. */
  scrollIntoView?: boolean;
};

/**
 * id 기반으로 인풋 요소를 등록하고, 다음 프레임에 포커스를 이동하는 레지스트리.
 * 동적으로 추가되는 인풋 목록(채팅 블록, 추가 정보 등)에서 사용한다.
 */
export function useInputRefRegistry<Element extends HTMLElement>() {
  const inputRefs = useRef(new Map<string, Element>());

  const registerInput = (id: string, element: Element | null) => {
    if (element) {
      inputRefs.current.set(id, element);
    } else {
      inputRefs.current.delete(id);
    }
  };

  const focusInput = (id: string, options?: FocusInputOptions) => {
    requestAnimationFrame(() => {
      const element = inputRefs.current.get(id);

      if (!element) return;

      if (options?.scrollIntoView) {
        element.focus({ preventScroll: true });
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        element.focus();
      }
    });
  };

  return { registerInput, focusInput };
}
