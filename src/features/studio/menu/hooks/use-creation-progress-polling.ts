'use client';

import { useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import {
  type getCreationRequestResponse,
  useGetCreationRequest,
} from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useIsCreationRequestPending } from '@/features/stories/_shared/hooks/use-is-creation-request-pending';
import { resolveCreationRecovery } from '@/features/stories/_shared/utils/creation-request-recovery';
import {
  buildStorylineDraftRecord,
  demotePendingCompletionToDraft,
  type InFlightCreationRequest,
  replacePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  applyStoryCompletedEffects,
  applyStorylinesGeneratedEffects,
} from '@/features/stories/_shared/utils/creation-side-effects';
import { FetchError } from '@/lib/custom-fetch';

/** 진행 카드가 보이는 동안의 생성·완성 상태 조회 간격(ms). 앱과 같은 5초다. */
export const CREATION_PROGRESS_POLL_INTERVAL_MS = 5000;

/**
 * 제작 탭의 진행 카드가 보이는 동안 서버의 생성·완성 상태를 조회해 결과를 미리 반영한다.
 * 스토리라인 생성이 끝나 있으면 레코드를 스토리라인 선택 단계의 STORY_DRAFT로 승격해
 * "이어서 만들기"가 로딩 없이 바로 결과를 복원하게 하고, 스토리 완성이 끝나 있으면 성공
 * 부수효과(회원 목록 재조회·게스트 서재 ID·게스트 카운터·픽셀)를 한 번만 적용한다.
 * 완성 레코드는 목록에 새 스토리가 도착한 뒤 목록 컴포넌트가 정리한다. 채팅은 만들지 않는다.
 * 완성 확정 실패·404는 레코드를 추가 정보 초안으로 되돌리고 토스트로 알린다. 스토리라인
 * 실패는 재시도 화면이 퍼널에 있으므로 조회만 멈추고 레코드는 재진입에 맡긴다.
 * 문서가 숨겨지면 TanStack Query 기본값대로 조회를 멈춘다.
 *
 * @param record 카드가 표시 중인 진행 요청 레코드
 */
export function useCreationProgressPolling(
  record: InFlightCreationRequest,
): void {
  const queryClient = useQueryClient();
  const { status: sessionStatus } = useSession();
  const { requestId, stage } = record;
  const isOriginalRequestPending = useIsCreationRequestPending(record);

  const query = useGetCreationRequest(requestId, {
    query: {
      enabled: !isOriginalRequestPending,
      refetchInterval: (state) =>
        isStorylineSettled(stage, state.state.data, state.state.error)
          ? false
          : CREATION_PROGRESS_POLL_INTERVAL_MS,
      retry: false,
      staleTime: 0,
      gcTime: 0,
    },
  });
  const { data, error } = query;

  useEffect(() => {
    if (isOriginalRequestPending || !data || data.status !== 200) {
      return;
    }

    const action = resolveCreationRecovery(stage, data.data);

    if (action.type === 'pending') {
      return;
    }

    if (action.type === 'storylines-completed') {
      const promoted = replacePendingCreationRequest(
        requestId,
        buildStorylineDraftRecord(
          requestId,
          record.generationRequest,
          action.result,
        ),
      );

      // 원 응답이 먼저 승격했으면 부수효과를 다시 적용하지 않는다.
      if (promoted) {
        applyStorylinesGeneratedEffects(queryClient);
      }

      return;
    }

    if (stage !== 'STORY_COMPLETION') {
      return;
    }

    const result = action.type === 'story-completed' ? action.result : null;
    const storyId = result?.id;

    if (typeof storyId !== 'string') {
      if (demotePendingCompletionToDraft(requestId)) {
        toast.error(TOAST_MESSAGE.STORY_COMPLETE_FAILED);
      }

      return;
    }

    // 원 응답이 먼저 ID를 확정한 레코드는 부수효과를 다시 적용하지 않는다.
    if (record.createdStoryId !== storyId) {
      applyStoryCompletedEffects(
        requestId,
        storyId,
        sessionStatus,
        queryClient,
        result?.genres,
      );
    }
  }, [
    data,
    isOriginalRequestPending,
    queryClient,
    record,
    requestId,
    sessionStatus,
    stage,
  ]);

  // 404(미존재·타인)는 되찾을 수 없다. 완성은 초안으로 되돌리고, 스토리라인은 조회만 멈춘다.
  useEffect(() => {
    if (
      !isOriginalRequestPending &&
      stage === 'STORY_COMPLETION' &&
      error instanceof FetchError &&
      error.status === 404 &&
      demotePendingCompletionToDraft(requestId)
    ) {
      toast.error(TOAST_MESSAGE.STORY_COMPLETE_FAILED);
    }
  }, [error, isOriginalRequestPending, requestId, stage]);
}

/**
 * 스토리라인 생성 실패·404는 재시도 화면이 퍼널에 있으므로 제작 탭에서는 조회를 멈춘다.
 *
 * @param stage 레코드 단계
 * @param data 마지막 조회 응답
 * @param error 마지막 조회 오류
 * @returns 스토리라인 단계에서 실패·404로 확정됐으면 true
 */
function isStorylineSettled(
  stage: InFlightCreationRequest['stage'],
  data: getCreationRequestResponse | undefined,
  error: unknown,
): boolean {
  if (stage !== 'STORYLINE_GENERATION') {
    return false;
  }

  if (error instanceof FetchError && error.status === 404) {
    return true;
  }

  return (
    data?.status === 200 &&
    resolveCreationRecovery(stage, data.data).type === 'failed'
  );
}
