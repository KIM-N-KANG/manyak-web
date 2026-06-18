import type { StoryDetailResponse } from '@/api/generated/models/storyDetailResponse';

export type StoryDetailItem = Omit<StoryDetailResponse, 'genres'> & {
  genres: string[];
};
