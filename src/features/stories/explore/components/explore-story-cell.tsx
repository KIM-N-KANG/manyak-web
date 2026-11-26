'use client';

import { useState } from 'react';

import { AnimatePresence } from 'motion/react';

import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import type { StoryCardSection } from '@/observability/analytics';

import { ExploreCellContext, ExploreStoryTile } from './explore-story-tile';

type ExploreStoryCellProps = {
  story: StoryListItem;
  position: number;
  section: StoryCardSection;
};

/**
 * 탐색 그리드의 한 칸. 이 칸에 다 나타난 표지를 기억해 이전 표지 위에 새 표지를 겹쳐 바꾼다.
 *
 * @see ExploreCellContext
 */
export function ExploreStoryCell({
  story,
  position,
  section,
}: ExploreStoryCellProps) {
  const [shownStoryId, setShownStoryId] = useState(story.id);

  return (
    <li className="relative grid bg-muted">
      <ExploreCellContext value={{ shownStoryId, onShown: setShownStoryId }}>
        <AnimatePresence initial={false}>
          <ExploreStoryTile
            key={story.id}
            story={story}
            position={position}
            section={section}
          />
        </AnimatePresence>
      </ExploreCellContext>
    </li>
  );
}
