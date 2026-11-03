'use client';

import { useState } from 'react';

import { AnimatePresence } from 'motion/react';

import type { StoryListItem } from '@/features/stories/_shared/types/story-list';

import { ExploreCellContext, ExploreStoryTile } from './explore-story-tile';

type ExploreStoryCellProps = {
  story: StoryListItem;
  position: number;
};

export function ExploreStoryCell({ story, position }: ExploreStoryCellProps) {
  const [shownStoryId, setShownStoryId] = useState(story.id);

  return (
    <li className="relative aspect-3/4 bg-muted">
      <ExploreCellContext value={{ shownStoryId, onShown: setShownStoryId }}>
        <AnimatePresence initial={false}>
          <ExploreStoryTile key={story.id} story={story} position={position} />
        </AnimatePresence>
      </ExploreCellContext>
    </li>
  );
}
