'use client';

import { useQuery } from '@tanstack/react-query';

import { getStoriesByIds } from '@/api/generated/endpoints/stories/stories';

import { toStoryListItems } from '../utils/to-story-list-items';
import { useCreatedStoryIds } from './use-created-story-ids';

/** 스토리 ID 목록으로 일괄 조회하는 쿼리의 키 접두사 */
export const STORIES_BATCH_QUERY_KEY = 'stories-batch';

/**
 * 로컬에 저장된 스토리 ID 목록으로 사용자가 생성한 스토리들을 조회하는 훅.
 * 저장 순서를 유지한 목록과 로딩/에러/빈 상태를 함께 반환한다.
 */
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
