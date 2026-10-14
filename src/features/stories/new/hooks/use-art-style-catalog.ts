'use client';

import { useGet3 } from '@/api/generated/endpoints/stories/stories';

/**
 * 제공 화풍 목록(`GET /stories/art-styles`)을 조회하는 훅.
 * 생성 훅 이름(`useGet3`)은 백엔드 operationId가 없어 붙은 이름이라 이 훅으로 감싼다.
 *
 * @returns 노출 순서대로 정렬된 화풍 목록(받기 전이나 실패하면 undefined)과 조회 상태
 */
export function useArtStyleCatalog() {
  const query = useGet3();

  return {
    artStyles: query.data?.status === 200 ? query.data.data : undefined,
    isPending: query.isPending,
    isError: query.isError || (query.isSuccess && query.data.status !== 200),
    refetch: query.refetch,
  };
}
