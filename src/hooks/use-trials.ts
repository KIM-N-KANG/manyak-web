'use client';

import { useSession } from 'next-auth/react';

import {
  getGetTrialsQueryKey,
  useGetTrials,
} from '@/api/generated/endpoints/trial-controller/trial-controller';
import type { TrialsResponse } from '@/api/generated/models';

/**
 * 무료 체험 사용량·한도(`GET /users/me/trials`)를 구독하는 훅.
 *
 * 인증 선택 API라 게스트도 조회한다(디바이스 ID 헤더는 공통 요청 로직이 붙인다). 같은
 * 경로가 게스트·회원에서 다른 카운터를 돌려주므로 세션 상태를 쿼리 키에 넣어 로그인·
 * 로그아웃 때 캐시가 섞이지 않게 한다. 세션이 확정되기 전에는 조회하지 않는다.
 * 소모 시점(채팅 완료·스토리라인 생성·스토리 완성)에는 `getGetTrialsQueryKey()`로
 * 무효화하면 세션별 키가 모두 다시 조회된다.
 *
 * @returns 체험 사용량 응답. 아직 받지 못했거나 실패하면 `undefined`다.
 */
export function useTrials(): TrialsResponse | undefined {
  const { status } = useSession();
  const { data } = useGetTrials({
    query: {
      queryKey: [...getGetTrialsQueryKey(), status],
      enabled: status !== 'loading',
    },
  });

  return data?.status === 200 ? data.data : undefined;
}
