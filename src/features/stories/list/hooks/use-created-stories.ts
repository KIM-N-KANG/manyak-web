'use client';

import { useSyncExternalStore } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getStoriesByIds } from '@/api/generated/endpoints/stories/stories';
import type { StorySummaryResponse } from '@/api/generated/models';
import {
  getCreatedStoryIdsSnapshot,
  getServerCreatedStoryIdsSnapshot,
  parseCreatedStoryIds,
  SERVER_STORY_IDS_SNAPSHOT,
  subscribeCreatedStoryIds,
} from '@/features/stories/new/utils/story-id-storage';

import type { StoryListItem } from '../types';

const STORIES_BATCH_QUERY_KEY = 'stories-batch';

const toStoryListItems = (
  storyIds: number[],
  stories: StorySummaryResponse[],
): StoryListItem[] => {
  const storyById = new Map(stories.map((story) => [story.id, story]));

  return storyIds
    .map((storyId) => storyById.get(storyId))
    .filter((story): story is StorySummaryResponse => story != null)
    .map((story) => ({ ...story, genres: story.genres ?? [] }));
};

/**
 * 로컬스토리지에 보관 중인 스토리 ID 목록을 읽어옵니다.
 * 서버 렌더링 시점에는 ID를 알 수 없으므로 `null`을 반환합니다.
 */
function useCreatedStoryIds(): number[] | null {
  const snapshot = useSyncExternalStore<
    string | null | typeof SERVER_STORY_IDS_SNAPSHOT
  >(
    subscribeCreatedStoryIds,
    getCreatedStoryIdsSnapshot,
    getServerCreatedStoryIdsSnapshot,
  );

  if (snapshot === SERVER_STORY_IDS_SNAPSHOT) {
    return null;
  }

  return parseCreatedStoryIds(snapshot);
}

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
