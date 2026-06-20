'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';

const BOTTOM_THRESHOLD_PX = 64;

export function useStickyScroll<T extends HTMLElement>(
  ref: RefObject<T | null>,
  dependency: unknown,
) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const pinnedRef = useRef(true);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const element = ref.current;

    if (!element) return;

    element.scrollTo({ top: element.scrollHeight, behavior });
    pinnedRef.current = true;
    setIsAtBottom(true);
  };

  const handleScroll = () => {
    const element = ref.current;

    if (!element) return;

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    const atBottom = distanceFromBottom <= BOTTOM_THRESHOLD_PX;

    pinnedRef.current = atBottom;
    setIsAtBottom(atBottom);
  };

  useEffect(() => {
    if (pinnedRef.current) {
      scrollToBottom('auto');
    }
    // dependency가 바뀔 때마다(콘텐츠 증가) 하단 고정 시 자동 스크롤
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependency]);

  return { isAtBottom, scrollToBottom, handleScroll };
}
