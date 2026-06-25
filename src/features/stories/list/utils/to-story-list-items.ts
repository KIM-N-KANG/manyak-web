import type { StorySummaryResponse } from '@/api/generated/models';

import type { StoryListItem } from '../types';

export const toStoryListItems = (
  storyIds: string[],
  stories: StorySummaryResponse[],
): StoryListItem[] => {
  const storyById = new Map(stories.map((story) => [story.id, story]));

  return storyIds
    .map((storyId) => storyById.get(storyId))
    .filter((story): story is StorySummaryResponse => story != null)
    .map((story) => ({ ...story, genres: story.genres ?? [] }));
};
