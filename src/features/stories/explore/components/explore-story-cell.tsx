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
