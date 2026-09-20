'use client';

import { useQueryClient } from '@tanstack/react-query';

/**
 * 지금 화면이 구독 중인 쿼리만 다시 읽는 함수를 돌려준다.
 * 당겨서 새로고침처럼 "이 화면의 데이터를 새로 받아라"는 동작에 쓴다. 기존 데이터는
 * 응답이 올 때까지 유지되고, 실패는 각 쿼리의 오류 상태로 화면이 처리한다.
 *
 * @returns 활성 쿼리 재조회를 시작하고 끝나면 resolve하는 함수
 */
export function useRefreshActiveQueries() {
  const queryClient = useQueryClient();

  return () => queryClient.refetchQueries({ type: 'active' });
}
