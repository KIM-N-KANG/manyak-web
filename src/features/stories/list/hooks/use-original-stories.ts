'use client';

import { useGetOriginalStories } from '@/api/generated/endpoints/stories/stories';
import { toOrderedStoryListItems } from '@/features/stories/_shared/utils/to-story-list-items';

/**
 * 마냑 공식 계정의 오리지널 스토리 목록을 조회하는 훅.
 * 인증이 필요 없어 게스트·회원 모두 같은 목록을 받고, 공식 계정이 없는 환경은 빈 배열이다.
 *
 * @returns 서버 순서를 유지한 오리지널 스토리 목록과 로딩·에러 상태, refetch 함수
 */
export function useOriginalStories() {
  const { data, isError, isPending, refetch } = useGetOriginalStories();

  return {
    stories: data?.status === 200 ? toOrderedStoryListItems(data.data) : [],
    isError,
    isLoading: isPending,
    refetch,
  };
}
