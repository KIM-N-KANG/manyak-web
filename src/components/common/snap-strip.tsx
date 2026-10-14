'use client';

import { Children, type ReactNode, useRef, useState } from 'react';

import { useDragScroll } from '@/hooks/use-drag-scroll';
import { cn } from '@/lib/utils';

/**
 * 점 표시 버튼의 접근성 이름을 만든다.
 *
 * @param index 0부터 시작하는 장 번호
 * @returns "N번째 화면 보기"
 */
export function buildSnapStripIndicatorLabel(index: number): string {
  return `${index + 1}번째 화면 보기`;
}

type SnapStripProps = {
  children: ReactNode;
};

export function SnapStrip({ children }: SnapStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const dragScrollProps = useDragScroll();

  const resolveCards = () => {
    const scroller = scrollerRef.current;

    return scroller
      ? { scroller, cards: [...scroller.children] as HTMLElement[] }
      : null;
  };

  const handleScroll = () => {
    const resolved = resolveCards();

    if (!resolved || resolved.cards.length === 0) {
      return;
    }

    const { scroller, cards } = resolved;
    const alignedLeft = scroller.scrollLeft + cards[0].offsetLeft;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - alignedLeft);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  };

  const handleIndicatorClick = (index: number) => {
    const resolved = resolveCards();
    const card = resolved?.cards[index];

    if (!resolved || !card) {
      return;
    }

    resolved.scroller.scrollTo({
      left: card.offsetLeft - resolved.cards[0].offsetLeft,
      behavior: 'smooth',
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        {...dragScrollProps}
        className="-mx-4 -my-2 scrollbar-none flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 py-2">
        {Children.map(children, (child) => (
          <div className="w-[82%] shrink-0 snap-start">{child}</div>
        ))}
      </div>
      <div className="flex items-center justify-center">
        {Children.map(children, (_, index) => (
          <button
            type="button"
            aria-label={buildSnapStripIndicatorLabel(index)}
            aria-current={index === activeIndex ? 'true' : undefined}
            onClick={() => handleIndicatorClick(index)}
            className="flex size-6 items-center justify-center">
            <span
              className={cn(
                'size-1.5 rounded-full bg-border transition-colors',
                index === activeIndex && 'bg-foreground-secondary',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
