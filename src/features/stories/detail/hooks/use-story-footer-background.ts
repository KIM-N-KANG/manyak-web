'use client';

import { useEffect, useRef } from 'react';

/**
 * 스크롤 끝에 가까워질수록 CTA 배경을 메타 정보와 같은 색으로 부드럽게 연결한다.
 *
 * @param scrollContainer 상세 본문의 스크롤 컨테이너
 * @param metadata 본문 마지막의 제작자·생성일 영역
 * @returns 본문과 CTA가 공유하는 배경 요소의 ref
 */
export function useStoryFooterBackground(
  scrollContainer: HTMLElement | null,
  metadata: HTMLElement | null,
) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const surface = surfaceRef.current;

    if (!surface) return;

    if (!scrollContainer || !metadata) {
      surface.style.setProperty(
        '--story-footer-background',
        'var(--background)',
      );

      return;
    }

    let animationFrame = 0;

    const updateBackground = () => {
      animationFrame = 0;

      const remaining = Math.max(
        0,
        scrollContainer.scrollHeight -
          scrollContainer.clientHeight -
          scrollContainer.scrollTop,
      );
      const fadeDistance = Math.max(metadata.offsetHeight * 2, 160);
      const progress =
        remaining <= 1 ? 1 : Math.max(0, 1 - remaining / fadeDistance);
      const easedProgress = progress * progress * (3 - 2 * progress);
      const background =
        progress === 1
          ? 'var(--muted)'
          : progress === 0
            ? 'var(--background)'
            : `color-mix(in oklab, var(--background), var(--muted) ${easedProgress * 100}%)`;

      surface.style.setProperty('--story-footer-background', background);
    };

    const requestUpdate = () => {
      if (animationFrame === 0) {
        animationFrame = window.requestAnimationFrame(updateBackground);
      }
    };
    const resizeObserver = new ResizeObserver(requestUpdate);

    resizeObserver.observe(scrollContainer);
    resizeObserver.observe(metadata);

    for (const child of scrollContainer.children) resizeObserver.observe(child);

    scrollContainer.addEventListener('scroll', requestUpdate, {
      passive: true,
    });
    updateBackground();

    return () => {
      resizeObserver.disconnect();
      scrollContainer.removeEventListener('scroll', requestUpdate);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [scrollContainer, metadata]);

  return surfaceRef;
}
