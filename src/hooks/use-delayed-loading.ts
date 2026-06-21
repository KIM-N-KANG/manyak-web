'use client';

import { useEffect, useRef, useState } from 'react';

const DEFAULT_DELAY = 100;
const DEFAULT_MIN_DURATION = 300;

type UseDelayedLoadingOptions = {
  delay?: number;
  minDuration?: number;
};

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
