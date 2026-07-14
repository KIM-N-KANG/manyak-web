'use client';

import { type RefObject, useEffect, useState } from 'react';

import { createInitialScrollSettleTracker } from '../utils/initial-scroll-settle';

/** 정착 감지가 이 시간을 넘기면 무조건 공개해 영구 숨김을 방지한다(ms) */
const SETTLE_TIMEOUT_MS = 500;

/**
 * 채팅 진입 직후 초기 스크롤이 실제 맨 아래에 정착했는지를 rAF 폴링으로
 * 감지한다. 정착 전 상태(추정 높이 기준 중간 걸림·빈 화면)가 노출되지 않도록
 * 스크롤러를 숨겼다가 공개하는 데 사용한다. 배경은 initial-scroll-settle 참고.
 *
 * @param viewportRef 스크롤 위치를 관찰할 뷰포트 엘리먼트 ref
 * @param skip 초기 스크롤 점프가 없는 화면(빈 채팅, start 정렬)이면 true
 * @returns 초기 스크롤이 정착했는지 여부
 */
export function useInitialScrollSettled(
  viewportRef: RefObject<HTMLDivElement | null>,
  { skip }: { skip: boolean },
) {
  const [settled, setSettled] = useState(skip);

  useEffect(() => {
    if (settled) {
      return;
    }

    const isSettled = createInitialScrollSettleTracker();
    let frameId: number;

    const timeoutId = window.setTimeout(() => {
      window.cancelAnimationFrame(frameId);
      setSettled(true);
    }, SETTLE_TIMEOUT_MS);

    const tick = () => {
      const viewport = viewportRef.current;

      if (
        viewport &&
        isSettled({
          scrollTop: viewport.scrollTop,
          scrollHeight: viewport.scrollHeight,
          clientHeight: viewport.clientHeight,
        })
      ) {
        window.clearTimeout(timeoutId);
        setSettled(true);

        return;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(frameId);
    };
  }, [settled, viewportRef]);

  return settled;
}
