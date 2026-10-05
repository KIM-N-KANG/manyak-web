'use client';

import { useGet2 } from '@/api/generated/endpoints/stories/stories';
import { toGenreCatalog } from '@/features/stories/_shared/utils/genre-catalog';

/**
 * 제공 장르 전체 목록(`GET /stories/genres`)을 조회하는 훅.
 * 생성 훅 이름(`useGet2`)은 백엔드 operationId가 없어 붙은 이름이라 이 훅으로 감싼다.
 *
 * @returns 제공 장르 목록(받기 전이나 실패하면 undefined)과 조회 상태
 */
export function useGenreCatalog() {
  const query = useGet2();

  return {
    catalog:
      query.data?.status === 200 ? toGenreCatalog(query.data.data) : undefined,
    isPending: query.isPending,
    isError: query.isError || (query.isSuccess && query.data.status !== 200),
    refetch: query.refetch,
  };
}
