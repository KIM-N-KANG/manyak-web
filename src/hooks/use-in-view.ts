'use client';

import { useEffect, useState } from 'react';

type UseInViewParams = {
  /** 가시성을 관찰할 대상 요소 */
  target: Element | null;
  /** 교차 영역으로 사용할 스크롤 컨테이너 (생략 시 뷰포트) */
  root?: Element | null;
  /** 대상이 마운트된 뒤 관찰을 시작하기 위한 활성화 플래그 */
  enabled?: boolean;
  /** 교차 영역을 확장/축소하는 마진 (IntersectionObserver rootMargin) */
  rootMargin?: string;
  /** in-view로 판정할 최소 가시 비율 (0~1). 예: 0.99면 거의 전부 보여야 true */
  threshold?: number;
  /**
   * 첫 관찰 결과가 도착하기 전에 사용할 초기값.
   * 관찰은 마운트 직후가 아니라 다음 렌더링 기회에 처음 보고되므로, 목록 끝 sentinel처럼
   * "보이면 무언가를 시작"하는 용도라면 false로 시작해야 첫 렌더에서 헛돌지 않는다.
   */
  initialInView?: boolean;
};

/**
 * IntersectionObserver로 대상 요소가 화면(또는 컨테이너)에 보이는지 관찰하는 훅.
 *
 * @param params 관찰 대상과 루트/마진/임계값 등의 옵션
 * @returns 대상이 화면(또는 컨테이너)에 보이는지 여부
 */
export function useInView({
  target,
  root,
  enabled = true,
  rootMargin,
  threshold = 0,
  initialInView = true,
}: UseInViewParams) {
  const [isInView, setIsInView] = useState(initialInView);

  useEffect(() => {
    if (!enabled || !target) return;

    const observer = new IntersectionObserver(
      ([entry]) =>
        setIsInView(
          entry.isIntersecting && entry.intersectionRatio >= threshold,
        ),
      { root: root ?? null, rootMargin, threshold },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [enabled, target, root, rootMargin, threshold]);

  return isInView;
}
