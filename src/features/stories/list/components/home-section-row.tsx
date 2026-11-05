'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import { StoryCard } from '@/features/stories/_shared/components/story-card';
import { STORY_LIST_COPY } from '@/features/stories/_shared/constants/story-list';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { useDragScroll } from '@/hooks/use-drag-scroll';

/** 한 화면에 온전히 보이는 카드 수. 카드 너비 클래스와 함께 바꾼다. */
const CARDS_PER_VIEW = 2;

type HomeSectionRowProps = {
  name: string;
  stories: StoryListItem[];
  /** 첫 섹션이면 앞 카드의 표지를 먼저 받는다. */
  isFirst: boolean;
};

export function HomeSectionRow({
  name,
  stories,
  isFirst,
}: HomeSectionRowProps) {
  const titleId = useId();
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const scrollTargetRef = useRef<number | null>(null);
  const dragScrollProps = useDragScroll();
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });
  const hasMore = stories.length > CARDS_PER_VIEW;

  useEffect(() => {
    const list = listRef.current;

    if (!list || !hasMore) return;

    const updateEdges = () => {
      if (
        scrollTargetRef.current !== null &&
        Math.abs(list.scrollLeft - scrollTargetRef.current) < 1
      ) {
        scrollTargetRef.current = null;
      }

      setEdges({
        atStart: list.scrollLeft <= 1,
        atEnd: list.scrollLeft + list.clientWidth >= list.scrollWidth - 1,
      });
    };
    const observer = new ResizeObserver(updateEdges);

    observer.observe(list);
    list.addEventListener('scroll', updateEdges, { passive: true });

    return () => {
      observer.disconnect();
      list.removeEventListener('scroll', updateEdges);
    };
  }, [hasMore]);

  const moveByCard = (direction: -1 | 1) => {
    const list = listRef.current;

    if (!list) return;

    const card = list.firstElementChild;

    if (!card) return;

    const step =
      card.getBoundingClientRect().width +
      parseFloat(getComputedStyle(list).columnGap);
    const maxScrollLeft = list.scrollWidth - list.clientWidth;
    const from = scrollTargetRef.current ?? list.scrollLeft;
    const target = Math.min(
      maxScrollLeft,
      Math.max(0, (Math.round(from / step) + direction) * step),
    );
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    scrollTargetRef.current = target;
    list.scrollTo({
      left: target,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-4">
        <h2
          id={titleId}
          className="min-w-0 truncate text-xl leading-7 font-semibold">
          {name}
        </h2>
        {hasMore ? (
          <div className="flex shrink-0 items-center gap-1">
            <SectionArrowButton
              icon={ArrowLeft01Icon}
              label={STORY_LIST_COPY.prevLabel}
              controls={listId}
              disabled={edges.atStart}
              onClick={() => moveByCard(-1)}
            />
            <SectionArrowButton
              icon={ArrowRight01Icon}
              label={STORY_LIST_COPY.nextLabel}
              controls={listId}
              disabled={edges.atEnd}
              onClick={() => moveByCard(1)}
            />
          </div>
        ) : null}
      </div>
      <ul
        {...dragScrollProps}
        ref={listRef}
        id={listId}
        data-drag-scrollable=""
        className="scrollbar-none flex gap-2 overflow-x-auto overscroll-x-contain px-4">
        {stories.map((story, index) => (
          <li key={story.id} className="w-[calc((100%-1rem)/2)] shrink-0">
            <StoryCard
              story={story}
              position={index}
              section="original"
              priority={isFirst && index < 3}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

type SectionArrowButtonProps = {
  icon: typeof ArrowLeft01Icon;
  label: string;
  controls: string;
  disabled: boolean;
  onClick: () => void;
};

function SectionArrowButton({
  icon,
  label,
  controls,
  disabled,
  onClick,
}: SectionArrowButtonProps) {
  return (
    <Button
      variant="secondary"
      aria-label={label}
      aria-controls={controls}
      disabled={disabled}
      onClick={onClick}
      className="size-7 rounded-full p-0 text-foreground disabled:opacity-40">
      <HugeiconsIcon
        icon={icon}
        className="size-4"
        strokeWidth={2}
        aria-hidden="true"
      />
    </Button>
  );
}
