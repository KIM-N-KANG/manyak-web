'use client';

import { useRef } from 'react';

const SWIPE_THRESHOLD = 50;

type UseHorizontalSwipeArgs = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
}: UseHorizontalSwipeArgs) {
  const touchStartXRef = useRef(0);

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartXRef.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (document.querySelector('[role="dialog"]')) {
      return;
    }

    const delta = event.changedTouches[0].clientX - touchStartXRef.current;

    if (Math.abs(delta) < SWIPE_THRESHOLD) {
      return;
    }

    if (delta < 0) {
      onSwipeLeft();
    } else {
      onSwipeRight();
    }
  };

  return { handleTouchStart, handleTouchEnd };
}
