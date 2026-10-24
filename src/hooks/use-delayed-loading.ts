'use client';

import { useEffect, useState } from 'react';

const DEFAULT_DELAY = 250;

type UseDelayedLoadingOptions = {
  /** 로딩 표시를 시작하기 전 대기 시간(ms) */
  delay?: number;
};

/**
 * 로딩 UI의 깜빡임을 막는 훅.
 * 로딩이 delay보다 짧게 끝나면 아예 표시하지 않고, 로딩이 끝나면 그 즉시 숨긴다.
 *
 * @param isLoading 현재 로딩 중인지 여부
 * @param options 지연 시간 옵션
 * @returns 로딩 UI를 표시해야 하는지 여부
 */
export function useDelayedLoading(
  isLoading: boolean,
  options: UseDelayedLoadingOptions = {},
) {
  const { delay = DEFAULT_DELAY } = options;

  const [isDelayElapsed, setIsDelayElapsed] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timer = setTimeout(() => setIsDelayElapsed(true), delay);

    return () => {
      clearTimeout(timer);
      setIsDelayElapsed(false);
    };
  }, [isLoading, delay]);

  return isLoading && isDelayElapsed;
}
