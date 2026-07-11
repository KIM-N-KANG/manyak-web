'use client';

import { useSession } from 'next-auth/react';

import { useGetMyStories } from '@/api/generated/endpoints/users/users';

import { useCreatedStoryIds } from './use-created-story-ids';

/**
 * 만든 스토리가 하나라도 있는지 여부를 반환하는 훅.
 * 회원은 서버 회원 목록(/users/me/stories, 스토리 목록과 캐시 공유), 게스트는 로컬 ID 존재로 판단한다.
 * 채팅 목록 빈 상태 안내처럼 스토리 데이터 전체가 필요 없는 분기에서 사용한다.
 */
export function useHasCreatedStories(): boolean {
  const { status } = useSession();
  const storyIds = useCreatedStoryIds();

  const myStoriesQuery = useGetMyStories(undefined, {
    query: { enabled: status === 'authenticated' },
  });

  if (status === 'authenticated') {
    return (
      myStoriesQuery.data?.status === 200 && myStoriesQuery.data.data.length > 0
    );
  }

  return (storyIds?.length ?? 0) > 0;
}
