'use client';

import {
  type DragEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
} from 'react';

/** 이 거리(px)보다 덜 움직이면 드래그가 아니라 클릭으로 본다. */
const DRAG_THRESHOLD = 5;

/** scrollend를 놓치더라도 스냅을 되돌리기까지 기다리는 최대 시간(ms). */
const SNAP_RESTORE_FALLBACK_MS = 1000;

/**
 * 스냅 지점 중 현재 위치에서 가장 가까운 곳으로 부드럽게 이동한 뒤 스냅을 되돌린다.
 * 드래그 중 끈 스냅을 바로 켜면 브라우저가 순간 이동으로 맞추고, WebKit은 이동 중에
 * 켜면 맞추지 않은 채 멈출 수 있어 목표에 도착한 scrollend에서만 되돌린다.
 *
 * @param scroller 드래그를 마친 스크롤 컨테이너
 */
function settleSnap(scroller: HTMLElement) {
  const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
  const scrollerLeft =
    scroller.getBoundingClientRect().left +
    (parseFloat(getComputedStyle(scroller).scrollPaddingLeft) || 0);
  // snap-start 정렬만 계산한다. center·end 스냅 영역이 생기면 정렬별 기준점을 더한다.
  const targets = [...scroller.children]
    .filter((child) => getComputedStyle(child).scrollSnapAlign !== 'none')
    .map((child) =>
      Math.min(
        maxScrollLeft,
        Math.max(
          0,
          scroller.scrollLeft +
            child.getBoundingClientRect().left -
            scrollerLeft,
        ),
      ),
    );
  const target = targets.reduce(
    (closest, next) =>
      Math.abs(next - scroller.scrollLeft) <
      Math.abs(closest - scroller.scrollLeft)
        ? next
        : closest,
    Number.POSITIVE_INFINITY,
  );
  const restore = () => {
    clearTimeout(fallbackTimer);
    scroller.removeEventListener('scrollend', handleScrollEnd);
    scroller.style.removeProperty('scroll-snap-type');
  };
  // 드래그 중의 scrollend가 늦게 도착할 수 있어 목표에 닿았을 때만 되돌린다.
  const handleScrollEnd = () => {
    if (Math.abs(scroller.scrollLeft - target) < 1) restore();
  };
  const fallbackTimer = setTimeout(restore, SNAP_RESTORE_FALLBACK_MS);

  if (!Number.isFinite(target) || Math.abs(target - scroller.scrollLeft) < 1) {
    restore();

    return;
  }

  scroller.addEventListener('scrollend', handleScrollEnd);
  scroller.scrollTo({ left: target, behavior: 'smooth' });
}

/**
 * 가로 스크롤 영역을 데스크톱 마우스로 끌어서 움직이게 하는 훅.
 * 반환한 props를 스크롤 컨테이너에 펼친다. 터치·펜은 브라우저 기본 스크롤을 그대로 쓴다.
 * 드래그로 움직인 직후의 클릭은 막아 칩·탭이 의도치 않게 눌리지 않게 한다.
 * 넘칠 때만 grab 커서를, 끄는 동안에는 문서 전체에 grabbing 커서를 보인다(globals.css).
 *
 * @returns 스크롤 컨테이너에 펼칠 이벤트 핸들러 props
 */
export function useDragScroll() {
  const suppressClickRef = useRef(false);

  // 마우스를 올릴 때마다 넘침을 다시 재서 칩 추가·창 크기 변경을 따라간다.
  const onPointerEnter = (event: ReactPointerEvent<HTMLElement>) => {
    const scroller = event.currentTarget;

    if (event.pointerType !== 'mouse') return;

    scroller.toggleAttribute(
      'data-drag-scrollable',
      scroller.scrollWidth > scroller.clientWidth,
    );
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const scroller = event.currentTarget;

    if (
      event.pointerType !== 'mouse' ||
      event.button !== 0 ||
      scroller.scrollWidth <= scroller.clientWidth
    ) {
      return;
    }

    const startX = event.clientX;
    const startScrollLeft = scroller.scrollLeft;
    const hasSnap = getComputedStyle(scroller).scrollSnapType !== 'none';
    let dragging = false;

    const handleMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;

      if (!dragging) {
        if (Math.abs(deltaX) < DRAG_THRESHOLD) return;

        dragging = true;
        window.getSelection()?.removeAllRanges();
        // 포인터가 영역 밖으로 나가도 커서가 유지되도록 문서 루트에 표시한다.
        document.documentElement.toggleAttribute('data-drag-scrolling', true);

        if (hasSnap) {
          scroller.style.scrollSnapType = 'none';
        }
      }

      scroller.scrollLeft = startScrollLeft - deltaX;
    };

    const handleEnd = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);

      if (!dragging) return;

      document.documentElement.removeAttribute('data-drag-scrolling');

      // 클릭은 pointerup 직후 같은 작업 안에서 발생하므로, 다음 작업에서 막기를 푼다.
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      });

      if (hasSnap) {
        settleSnap(scroller);
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
  };

  const onClickCapture = (event: MouseEvent) => {
    if (!suppressClickRef.current) return;

    event.preventDefault();
    event.stopPropagation();
  };

  return {
    onPointerEnter,
    onPointerDown,
    onClickCapture,
    // 이미지·링크의 기본 드래그가 시작되면 pointercancel로 드래그 스크롤이 끊긴다.
    onDragStart: (event: DragEvent) => event.preventDefault(),
  };
}
