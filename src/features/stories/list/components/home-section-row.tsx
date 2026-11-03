'use client';

import { useId } from 'react';

import { StoryCard } from '@/features/stories/_shared/components/story-card';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { useDragScroll } from '@/hooks/use-drag-scroll';

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
  const dragScrollProps = useDragScroll();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="px-4 text-lg leading-7 font-semibold">
        {name}
      </h2>
      <ul
        {...dragScrollProps}
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
