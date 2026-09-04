'use client';

import { useGetOriginalStories } from '@/api/generated/endpoints/stories/stories';
import type { StorySummaryResponse } from '@/api/generated/models';
import { toOrderedStoryListItems } from '@/features/stories/_shared/utils/to-story-list-items';

/**
 * 마냑 공식 계정의 오리지널 스토리 목록을 조회하는 훅.
 * 인증이 필요 없어 게스트·회원 모두 같은 목록을 받고, 공식 계정이 없는 환경은 빈 배열이다.
 *
 * 서버가 미리 읽은 목록이 있으면 초기 데이터로 심어 첫 렌더부터 카드를 그린다(검색 색인용
 * 서버 렌더). 기본 staleTime 안에서는 다시 조회하지 않아 서버·클라이언트가 같은 목록을 본다.
 *
 * @param initialStories 서버 렌더 시점에 읽은 오리지널 목록. 없으면 클라이언트가 조회한다
 * @returns 서버 순서를 유지한 오리지널 스토리 목록과 로딩·에러 상태, refetch 함수
 */
export function useOriginalStories(initialStories?: StorySummaryResponse[]) {
  const { data, isError, isPending, refetch } = useGetOriginalStories({
    query: {
      initialData: initialStories
        ? { data: initialStories, status: 200, headers: new Headers() }
        : undefined,
    },
  });

  return {
    stories: data?.status === 200 ? toOrderedStoryListItems(data.data) : [],
    isError,
    isLoading: isPending,
    refetch,
  };
}
