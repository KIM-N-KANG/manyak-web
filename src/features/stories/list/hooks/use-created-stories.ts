'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { getStoriesByIds } from '@/api/generated/endpoints/stories/stories';
import { useGetMyStories } from '@/api/generated/endpoints/users/users';
import { useCreatedStoryIds } from '@/features/stories/_shared/hooks/use-created-story-ids';

import {
  toOrderedStoryListItems,
  toStoryListItems,
} from '../utils/to-story-list-items';

/** 스토리 ID 목록으로 일괄 조회하는 쿼리의 키 접두사 */
export const STORIES_BATCH_QUERY_KEY = 'stories-batch';

/**
 * 사용자가 생성한 스토리 목록을 조회하는 훅.
 * 회원은 서버 회원 목록(/users/me/stories), 게스트는 로컬 ID 배치 조회를 사용하며
 * 두 모드 모두 동일한 형태(목록·로딩·에러·빈 상태)를 반환한다.
 *
 * @returns 스토리 목록과 로딩·에러·빈 상태, refetch 함수
 */
export function useCreatedStories() {
  const { status } = useSession();
  const storyIds = useCreatedStoryIds();

  const myStoriesQuery = useGetMyStories(undefined, {
    query: { enabled: status === 'authenticated' },
  });

  const hasStoryIds = storyIds != null && storyIds.length > 0;
  const guestQuery = useQuery({
    queryKey: [STORIES_BATCH_QUERY_KEY, storyIds],
    queryFn: async () => {
      const response = await getStoriesByIds({ storyIds: storyIds ?? [] });
      const stories = response.status === 200 ? response.data : [];

      return toStoryListItems(storyIds ?? [], stories);
    },
    enabled: status === 'unauthenticated' && hasStoryIds,
  });

  // 세션 판별 중('loading')에는 회원 분기의 로딩 상태를 보여 깜빡임을 막는다.
  if (status !== 'unauthenticated') {
    const stories =
      myStoriesQuery.data?.status === 200
        ? toOrderedStoryListItems(myStoriesQuery.data.data)
        : [];
    const isError =
      myStoriesQuery.isError ||
      (myStoriesQuery.data != null && myStoriesQuery.data.status !== 200);
    const isLoading = status === 'loading' || myStoriesQuery.isPending;

    return {
      stories,
      isLoading,
      isError,
      isEmpty: !isLoading && !isError && stories.length === 0,
      refetch: myStoriesQuery.refetch,
    };
  }

  const isLoading = storyIds == null || (hasStoryIds && guestQuery.isPending);
  const stories = guestQuery.data ?? [];

  return {
    stories,
    isLoading,
    isError: guestQuery.isError,
    isEmpty: !isLoading && !guestQuery.isError && stories.length === 0,
    refetch: guestQuery.refetch,
  };
}
