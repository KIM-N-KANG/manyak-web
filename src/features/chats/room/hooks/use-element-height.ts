'use client';

import { useEffect, useState } from 'react';

/**
 * 요소의 렌더 높이를 ResizeObserver로 따라가는 훅.
 *
 * 채팅 메뉴 시트는 메뉴와 이프 내역을 오갈 때 이 높이로 시트 높이를 애니메이션한다. 시트는 내용 높이(auto)를 따르는데
 * CSS `interpolate-size`는 auto를 바뀐 뒤의 내용으로 계산해 시작 높이가 튀고 Safari는 지원하지 않아, 측정한 수치로 잇는다.
 *
 * @param element 높이를 잴 요소. 붙기 전에는 null이다
 * @returns 측정한 높이(px). 첫 측정 전이나 요소가 없으면 undefined
 */
export function useElementHeight(element: HTMLElement | null) {
  const [measured, setMeasured] = useState<{
    element: HTMLElement;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!element) return;

    const observer = new ResizeObserver(([entry]) =>
      setMeasured({ element, height: entry.borderBoxSize[0].blockSize }),
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [element]);

  return measured?.element === element ? measured.height : undefined;
}
