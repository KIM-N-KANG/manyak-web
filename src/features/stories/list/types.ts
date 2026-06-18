import type { StorySummaryResponse } from '@/api/generated/models/storySummaryResponse';

export type StoryListItem = Omit<StorySummaryResponse, 'genres'> & {
  genres: string[];
};
