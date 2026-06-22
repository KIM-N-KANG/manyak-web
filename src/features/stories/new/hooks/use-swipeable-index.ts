'use client';

import { useHorizontalSwipe } from './use-horizontal-swipe';

type UseSwipeableIndexArgs = {
  index: number;
  count: number;
  onIndexChange: (index: number) => void;
  /** 다음 인덱스로 이동(왼쪽 스와이프)할 수 있는지 판단한다. 미지정 시 항상 허용 */
  canMoveTo?: (index: number) => boolean;
};

/**
 * 가로 스와이프로 [0, count - 1] 범위의 인덱스를 좌우 이동시키는 훅.
 */
export function useSwipeableIndex({
  index,
  count,
  onIndexChange,
  canMoveTo,
}: UseSwipeableIndexArgs) {
  return useHorizontalSwipe({
    onSwipeLeft: () => {
      const nextIndex = index + 1;

      if (nextIndex > count - 1) {
        return;
      }

      if (canMoveTo && !canMoveTo(nextIndex)) {
        return;
      }

      onIndexChange(nextIndex);
    },
    onSwipeRight: () => {
      const previousIndex = index - 1;

      if (previousIndex < 0) {
        return;
      }

      onIndexChange(previousIndex);
    },
  });
}
