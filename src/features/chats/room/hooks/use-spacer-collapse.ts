'use client';

import { type RefObject, useLayoutEffect } from 'react';

import { computeCollapsedSpacerHeight } from '../utils/spacer-collapse';

/**
 * 스트리밍이 끝난 뒤 남는 앵커 고정용 스페이서(하단 여백)를 사용자의 위쪽
 * 스크롤 여유만큼 점진 회수하는 훅.
 *
 * 스페이서 높이는 MessageScroller 프리미티브가 인라인 height로 관리하므로
 * 직접 건드리지 않고 max-height 캡만 씌운다. 스트리밍 중에는 앵커 고정에
 * 스페이서가 필요하므로 캡을 해제하고, 해제는 프리미티브가 새 앵커를
 * 고정(MutationObserver 마이크로태스크)하기 전에 layout effect에서 끝낸다.
 *
 * @param viewportRef 메시지 스크롤러 뷰포트 ref
 * @param isStreaming 스트리밍 진행 여부
 */
export function useSpacerCollapse(
  viewportRef: RefObject<HTMLDivElement | null>,
  isStreaming: boolean,
) {
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const spacer = viewport?.querySelector<HTMLElement>(
      '[data-message-scroller-spacer]',
    );

    if (!viewport || !spacer) {
      return;
    }

    if (isStreaming) {
      spacer.style.maxHeight = '';

      return;
    }

    const collapse = () => {
      if (spacer.hidden) {
        return;
      }

      const spacerHeight = spacer.getBoundingClientRect().height;

      if (spacerHeight <= 0) {
        return;
      }

      const collapsedHeight = computeCollapsedSpacerHeight({
        spacerHeight,
        scrollTop: viewport.scrollTop,
        scrollHeight: viewport.scrollHeight,
        clientHeight: viewport.clientHeight,
      });

      if (collapsedHeight < spacerHeight) {
        spacer.style.maxHeight = `${collapsedHeight}px`;
      }
    };

    // 스트리밍 종료 직후에도 한 번 실행해, 사용자가 아래(스페이서 영역)에서
    // 기다리던 경우 확정 턴이 채워지고 남은 여백을 스크롤 없이 즉시 회수한다.
    collapse();

    viewport.addEventListener('scroll', collapse, { passive: true });

    return () => viewport.removeEventListener('scroll', collapse);
  }, [viewportRef, isStreaming]);
}
