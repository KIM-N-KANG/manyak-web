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

/** IntersectionObserver로 대상 요소가 화면(또는 컨테이너)에 보이는지 관찰하는 훅 */
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
