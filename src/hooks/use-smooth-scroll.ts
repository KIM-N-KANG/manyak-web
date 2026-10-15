'use client';

import { type RefObject, useEffect } from 'react';

import Lenis from 'lenis';

/**
 * 스크롤 컨테이너의 휠 스크롤을 Lenis로 부드럽게 한다. 위치는 컨테이너의 scrollTop으로
 * 움직이므로 scroll 이벤트와 motion `useScroll`이 그대로 동작한다. 터치는 네이티브 관성을
 * 쓰고, 동작 줄이기 설정이면 Lenis가 스스로 보간을 끈다.
 *
 * @param scrollerRef 부드럽게 할 스크롤 컨테이너
 * @param enabled 컨테이너를 그린 뒤 true로 넘긴다. 조건부로 그리는 화면이 다시 붙이게 한다
 */
export function useSmoothScroll(
  scrollerRef: RefObject<HTMLElement | null>,
  enabled = true,
) {
  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!enabled || !scroller) return;

    const lenis = new Lenis({
      wrapper: scroller,
      content: scroller,
      // ponytail: 끝 위치를 매 프레임 scroller에서 다시 읽는다(레이아웃 읽기). 콘텐츠를 감싼
      // 단일 요소가 없어 크기 감시 대신 쓴다. 긴 목록에 붙이면 콘텐츠 래퍼를 두고 끈다.
      naiveDimensions: true,
      autoRaf: true,
    });

    return () => lenis.destroy();
  }, [scrollerRef, enabled]);
}
