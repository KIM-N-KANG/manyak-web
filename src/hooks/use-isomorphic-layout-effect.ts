import { useEffect, useLayoutEffect } from 'react';

/** 서버 렌더링 시 useLayoutEffect 경고를 피하기 위해 useEffect로 대체한다. */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
