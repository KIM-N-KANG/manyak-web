import { type RefObject, useLayoutEffect } from 'react';

/** 화면 키별로 떠날 때의 스크롤 위치. 문서 단위라 새로고침하면 비워진다. */
const positions = new Map<string, number>();

/** 내용이 자라기를 기다리는 상한. 넘기면 지금 높이에서 맞출 수 있는 만큼만 복원한다. */
const RESTORE_TIMEOUT_MS = 2000;

/**
 * 스크롤 위치를 화면 키로 기억한다. 스크롤 이벤트마다 부른다.
 *
 * @param key 화면 키(경로와 쿼리)
 * @param top 스크롤러의 scrollTop
 */
export function rememberScrollPosition(key: string, top: number): void {
  positions.set(key, top);
}

/**
 * 화면 키가 바뀌면 그 키로 기억한 스크롤 위치를 스크롤러에 되돌리는 훅.
 *
 * 탭 전환과 상세·채팅방에서의 복귀는 내부 스크롤러를 다시 그리거나 Next가 새 세그먼트를 맨 위로 끌어올려
 * 위치가 사라지므로, 떠날 때 기억한 값을 돌려놓는다. 목록 데이터가 아직 짧아 닿지 못하면 내용이 자라는 동안
 * 다시 시도한다.
 *
 * @param scrollerRef 스크롤러 요소 ref
 * @param key 화면 키(경로와 쿼리)
 */
export function useScrollRestoration(
  scrollerRef: RefObject<HTMLElement | null>,
  key: string,
): void {
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const target = positions.get(key) ?? 0;

    if (!scroller) return;

    const apply = () => {
      scroller.scrollTop = target;

      return Math.abs(scroller.scrollTop - target) < 1;
    };

    if (apply()) return;

    const observer = new ResizeObserver(() => {
      if (apply()) {
        observer.disconnect();
        window.clearTimeout(timer);
      }
    });

    for (const child of scroller.children) observer.observe(child);

    const timer = window.setTimeout(
      () => observer.disconnect(),
      RESTORE_TIMEOUT_MS,
    );

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [scrollerRef, key]);
}
