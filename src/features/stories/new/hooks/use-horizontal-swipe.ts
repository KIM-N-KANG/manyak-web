'use client';

import { useRef } from 'react';

const SWIPE_THRESHOLD = 112;
const HORIZONTAL_INTENT_RATIO = 1.5;
const TEXT_INPUT_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

type UseHorizontalSwipeArgs = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
}: UseHorizontalSwipeArgs) {
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const startedOnTextInputRef = useRef(false);

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];

    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    startedOnTextInputRef.current = Boolean(
      (event.target as HTMLElement | null)?.closest(TEXT_INPUT_SELECTOR),
    );
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (document.querySelector('[role="dialog"]')) {
      return;
    }

    if (startedOnTextInputRef.current) {
      return;
    }

    if (window.getSelection()?.toString()) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    if (Math.abs(deltaX) < Math.abs(deltaY) * HORIZONTAL_INTENT_RATIO) {
      return;
    }

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
      return;
    }

    if (deltaX < 0) {
      onSwipeLeft();
    } else {
      onSwipeRight();
    }
  };

  return { handleTouchStart, handleTouchEnd };
}
