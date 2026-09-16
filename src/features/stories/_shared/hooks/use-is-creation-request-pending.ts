'use client';

import { useIsMutating } from '@tanstack/react-query';

import {
  getCreateSimpleStoryMutationOptions,
  getGenerateSimpleStorylinesMutationOptions,
} from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import type { InFlightCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';

/**
 * 화면을 떠난 뒤에도 같은 생성 요청의 POST가 진행 중인지 구독한다.
 * 서버의 요청 등록보다 복구 GET이 먼저 도착해 404로 실패하는 경합을 막는다.
 *
 * @param record 복구할 생성 요청, 없으면 null
 * @returns 같은 requestId의 원 POST가 진행 중이면 true
 */
export function useIsCreationRequestPending(
  record: InFlightCreationRequest | null,
): boolean {
  return (
    useIsMutating({
      mutationKey:
        record?.stage === 'STORYLINE_GENERATION'
          ? getGenerateSimpleStorylinesMutationOptions().mutationKey
          : getCreateSimpleStoryMutationOptions().mutationKey,
      predicate: (mutation) => {
        const variables = mutation.state.variables as
          | { data: { requestId: string } }
          | undefined;

        return (
          record !== null && variables?.data.requestId === record.requestId
        );
      },
    }) > 0
  );
}
