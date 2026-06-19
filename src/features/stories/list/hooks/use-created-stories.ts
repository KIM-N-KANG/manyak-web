'use client';

import { useQuery } from '@tanstack/react-query';

import { getStoriesByIds } from '@/api/generated/endpoints/stories/stories';

import { toStoryListItems } from '../utils/to-story-list-items';
import { useCreatedStoryIds } from './use-created-story-ids';

const STORIES_BATCH_QUERY_KEY = 'stories-batch';

export function useCreatedStories() {
  const storyIds = useCreatedStoryIds();

  const query = useQuery({
    queryKey: [STORIES_BATCH_QUERY_KEY, storyIds],
    queryFn: async () => {
      const response = await getStoriesByIds({ storyIds: storyIds ?? [] });
      const stories = response.status === 200 ? response.data : [];

      return toStoryListItems(storyIds ?? [], stories);
    },
    enabled: storyIds != null && storyIds.length > 0,
  });

  const hasStoryIds = storyIds != null && storyIds.length > 0;
  const isLoading = storyIds == null || (hasStoryIds && query.isPending);
  const stories = query.data ?? [];

  return {
    stories,
    isLoading,
    isError: query.isError,
    isEmpty: !isLoading && !query.isError && stories.length === 0,
    refetch: query.refetch,
  };
}
