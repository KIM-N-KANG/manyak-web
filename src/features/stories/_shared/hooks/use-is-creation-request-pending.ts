'use client';

import { type Mutation, useMutationState } from '@tanstack/react-query';

import {
  getCreateSimpleStoryMutationOptions,
  getGenerateSimpleStorylinesMutationOptions,
} from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import type { InFlightCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';

/** 스토리라인 생성·스토리 완성 뮤테이션 키의 첫 항목(생성 코드가 고정 문자열을 쓴다). */
const CREATION_MUTATION_KEYS = new Set(
  [
    getGenerateSimpleStorylinesMutationOptions().mutationKey,
    getCreateSimpleStoryMutationOptions().mutationKey,
  ].map((key) => JSON.stringify(key)),
);

/**
 * 뮤테이션이 생성·완성 요청인지 판별한다.
 *
 * @param mutation 검사할 뮤테이션
 * @returns 스토리라인 생성 또는 스토리 완성 뮤테이션이면 true
 */
function isCreationMutation(mutation: Mutation): boolean {
  return CREATION_MUTATION_KEYS.has(
    JSON.stringify(mutation.options.mutationKey ?? null),
  );
}

/**
 * 진행 중인 뮤테이션의 요청 ID를 꺼낸다.
 *
 * @param mutation 진행 중 뮤테이션
 * @returns 요청 본문의 requestId. 없으면 null
 */
function selectRequestId(mutation: Mutation): string | null {
  const variables = mutation.state.variables as
    | { data?: { requestId?: string } }
    | undefined;

  return variables?.data?.requestId ?? null;
}

/**
 * 화면을 떠난 뒤에도 같은 생성 요청의 POST가 진행 중인지 구독한다.
 * 서버의 요청 등록보다 복구 GET이 먼저 도착해 404로 실패하는 경합을 막는다.
 *
 * 필터는 레코드와 무관하게 고정하고 레코드 비교는 렌더에서 한다. `useMutationState`는
 * 뮤테이션 캐시 이벤트가 있을 때만 스냅샷을 다시 계산하므로, 레코드가 뒤늦게 정해지는
 * 진입(재개 의도 복원)에서 필터에 레코드를 넣으면 스냅샷이 낡은 채 남는다.
 *
 * @param record 복구할 생성 요청, 없으면 null
 * @returns 같은 requestId의 원 POST가 진행 중이면 true
 */
export function useIsCreationRequestPending(
  record: InFlightCreationRequest | null,
): boolean {
  const pendingRequestIds = useMutationState({
    filters: { status: 'pending', predicate: isCreationMutation },
    select: selectRequestId,
  });

  return record !== null && pendingRequestIds.includes(record.requestId);
}
