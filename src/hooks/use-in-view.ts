'use client';

import { type RefObject, useEffect, useState } from 'react';

type UseInViewParams = {
  /** 가시성을 관찰할 대상 요소 ref */
  targetRef: RefObject<Element | null>;
  /** 교차 영역으로 사용할 스크롤 컨테이너 ref (생략 시 뷰포트) */
  rootRef?: RefObject<Element | null>;
  /** 대상이 마운트된 뒤 관찰을 시작하기 위한 활성화 플래그 */
  enabled?: boolean;
};

/**
 * 대상 요소가 스크롤 컨테이너(또는 뷰포트) 안에 보이는지 여부를 반환합니다.
 * 대상이 비동기로 마운트되는 경우 `enabled`로 관찰 시점을 제어하세요.
 */
export function useInView({
  targetRef,
  rootRef,
  enabled = true,
}: UseInViewParams) {
  const [isInView, setIsInView] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    const target = targetRef.current;

    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { root: rootRef?.current ?? null },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [enabled, targetRef, rootRef]);

  return isInView;
}
