'use client';

import { useEffect, useRef, useState } from 'react';

const DEFAULT_DELAY = 100;
const DEFAULT_MIN_DURATION = 300;

type UseDelayedLoadingOptions = {
  /** 로딩 표시를 시작하기 전 대기 시간(ms) */
  delay?: number;
  /** 로딩 표시를 유지할 최소 시간(ms) */
  minDuration?: number;
};

/**
 * 로딩 UI의 깜빡임을 막는 훅.
 * 로딩이 delay보다 짧게 끝나면 아예 표시하지 않고,
 * 일단 표시되면 minDuration만큼은 유지한 뒤 사라진다.
 *
 * @param isLoading 현재 로딩 중인지 여부
 * @param options 지연/최소 유지 시간 옵션
 * @returns 로딩 UI를 표시해야 하는지 여부
 */
export function useDelayedLoading(
  isLoading: boolean,
  options: UseDelayedLoadingOptions = {},
) {
  const { delay = DEFAULT_DELAY, minDuration = DEFAULT_MIN_DURATION } = options;

  const [showLoading, setShowLoading] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        shownAtRef.current = Date.now();
        setShowLoading(true);
      }, delay);

      return () => clearTimeout(timer);
    }

    if (shownAtRef.current == null) {
      return;
    }

    const remaining = Math.max(
      minDuration - (Date.now() - shownAtRef.current),
      0,
    );
    const timer = setTimeout(() => {
      shownAtRef.current = null;
      setShowLoading(false);
    }, remaining);

    return () => clearTimeout(timer);
  }, [isLoading, delay, minDuration]);

  return showLoading;
}
