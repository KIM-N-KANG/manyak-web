'use client';

import { useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { useList } from '@/api/generated/endpoints/story-submission-controller/story-submission-controller';
import { getGetMyStoriesQueryKey } from '@/api/generated/endpoints/users/users';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { readCreateSubmissions } from '@/features/studio/_shared/utils/story-submission';

/** 검토 중인 제출본이 있을 때 목록을 다시 조회하는 간격이다. 간편 제작 완성 카드와 같다. */
const PENDING_REFETCH_INTERVAL_MS = 5000;

/** 한 번에 받는 제출본 수다. 서버 상한과 같다. */
const SUBMISSION_LIMIT = 100;

/**
 * 제작 탭에 보일 검토 중·반려·실패한 일반 제작 제출본을 조회하는 훅. 회원만 조회한다.
 * 검토 중인 제출본이 있는 동안 주기적으로 다시 조회하고, 목록에서 빠진 제출본(승인·삭제)이 있으면
 * 내 스토리 목록을 새로 받아 승인된 스토리가 바로 보이게 한다.
 *
 * @returns 제출본 목록(최신순)
 */
export function useStorySubmissions() {
  const { isMember } = useMemberAccess();
  const queryClient = useQueryClient();
  const query = useList(
    { limit: SUBMISSION_LIMIT },
    {
      query: {
        enabled: isMember,
        refetchInterval: ({ state }) =>
          state.data?.status === 200 &&
          readCreateSubmissions(state.data.data).some(
            ({ status }) => status === 'PENDING',
          )
            ? PENDING_REFETCH_INTERVAL_MS
            : false,
      },
    },
  );
  // 조회에 실패하면 제출본 카드만 숨기고 내 스토리 목록은 그대로 보인다.
  const submissions =
    query.data?.status === 200 ? readCreateSubmissions(query.data.data) : [];
  const idsKey = submissions.map(({ submissionId }) => submissionId).join(',');
  const previousIdsRef = useRef<string | null>(null);

  useEffect(() => {
    const previous = previousIdsRef.current;

    previousIdsRef.current = idsKey;

    if (previous === null) return;

    const current = new Set(idsKey.split(','));

    if (previous.split(',').some((id) => id && !current.has(id))) {
      void queryClient.invalidateQueries({
        queryKey: getGetMyStoriesQueryKey(),
      });
    }
  }, [idsKey, queryClient]);

  return { submissions };
}
