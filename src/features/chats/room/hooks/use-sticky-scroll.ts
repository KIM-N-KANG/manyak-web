'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';

const BOTTOM_THRESHOLD_PX = 64;

export function useStickyScroll<T extends HTMLElement>(
  ref: RefObject<T | null>,
  dependency: unknown,
  anchorRef?: RefObject<HTMLElement | null> | null,
  behavior: ScrollBehavior = 'auto',
) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const pinnedRef = useRef(true);

  // 자동 스크롤 목표 위치.
  // anchorRef가 있으면 "맨 아래"와 "anchor를 최상단에 두는 위치" 중 더 위쪽을 택해,
  // anchor가 화면 최상단에 닿으면 그 이상 내려가지 않도록 고정한다.
  const computeTarget = () => {
    const element = ref.current;

    if (!element) return 0;

    const bottom = element.scrollHeight - element.clientHeight;
    const anchor = anchorRef?.current;

    if (!anchor) return bottom;

    const anchorTop =
      element.scrollTop +
      (anchor.getBoundingClientRect().top -
        element.getBoundingClientRect().top);

    return Math.min(bottom, anchorTop);
  };

  const scrollToTarget = (behavior: ScrollBehavior = 'auto') => {
    const element = ref.current;

    if (!element) return;

    element.scrollTo({ top: computeTarget(), behavior });
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const element = ref.current;

    if (!element) return;

    element.scrollTo({ top: element.scrollHeight, behavior });
    pinnedRef.current = true;
    setIsAtBottom(true);
  };

  // 현재 위치 기준으로 아래에 더 스크롤할 내용이 있는지 측정.
  const measureIsAtBottom = () => {
    const element = ref.current;

    if (!element) return true;

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    const atBottom = distanceFromBottom <= BOTTOM_THRESHOLD_PX;

    setIsAtBottom(atBottom);

    return atBottom;
  };

  const handleScroll = () => {
    pinnedRef.current = measureIsAtBottom();
  };

  useEffect(() => {
    if (pinnedRef.current) {
      scrollToTarget(behavior);
    }

    // 콘텐츠가 늘어나면(입력 상단 고정 등으로 스크롤 이벤트가 없어도) 하단 여부 갱신
    measureIsAtBottom();
    // dependency가 바뀔 때마다(콘텐츠 증가) 하단 고정 시 목표 위치로 스크롤
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependency]);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    // 입력창이 늘어나는 등으로 스크롤 영역 높이가 줄어들면 하단 고정 유지
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) {
        scrollToTarget('auto');
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  return { isAtBottom, scrollToBottom, handleScroll };
}
