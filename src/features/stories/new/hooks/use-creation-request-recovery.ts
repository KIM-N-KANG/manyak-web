'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

import { useGetCreationRequest } from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import type {
  GenerateSimpleStorylinesResponse,
  SimpleStoryCreateResponse,
} from '@/api/generated/models';
import type { InFlightCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  getPendingCreationRequestSnapshot,
  getServerPendingCreationRequestSnapshot,
  parsePendingCreationRequest,
  subscribePendingCreationRequest,
  takePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { FetchError } from '@/lib/custom-fetch';

import { resolveCreationRecovery } from '../utils/creation-request-recovery';

/** PENDING 복구 레코드의 진행 상태를 재조회하는 폴링 주기(ms) */
export const RECOVERY_POLL_INTERVAL_MS = 3000;

/**
 * 문서 가시성 변경을 구독한다.
 *
 * @param onStoreChange 가시성 변경 시 호출할 콜백
 * @returns 구독 해제 함수
 */
function subscribePageVisibility(onStoreChange: () => void): () => void {
  document.addEventListener('visibilitychange', onStoreChange);

  return () => document.removeEventListener('visibilitychange', onStoreChange);
}

/**
 * 현재 문서가 사용자에게 보이는지 반환한다.
 *
 * @returns 문서가 visible이면 true
 */
function getPageVisibilitySnapshot(): boolean {
  return document.visibilityState === 'visible';
}

/**
 * 서버 렌더링 시 복구 쿼리 가시성 스냅샷을 반환한다.
 *
 * @returns hydration 전에는 true
 */
function getServerPageVisibilitySnapshot(): boolean {
  return true;
}

type UseCreationRequestRecoveryArgs = {
  /** 원 생성 요청이 진행 중인 동안 true — 복구 조회를 보류하고 원 응답을 기다린다. */
  suspended: boolean;
  /** 미정리 레코드로 복구를 시작할 때 해당 단계 로딩 화면을 복원한다. */
  onRestorePending: (record: InFlightCreationRequest) => void;
  /** 스토리라인 생성이 완료돼 있던 경우 결과 화면을 복원한다. */
  onStorylinesCompleted: (
    record: InFlightCreationRequest,
    result: GenerateSimpleStorylinesResponse,
  ) => void;
  /** 스토리 완성이 완료돼 있던 경우 후속 흐름(채팅 생성)으로 잇는다. */
  onStoryCompleted: (
    record: InFlightCreationRequest,
    result: SimpleStoryCreateResponse,
  ) => void;
  /** 생성이 실패했거나(FAILED) 더 이상 되찾을 수 없는(404) 경우 기존 실패 처리로 합류한다. */
  onFailed: (record: InFlightCreationRequest) => void;
};

/**
 * 백그라운드 전환으로 응답을 못 받은 생성 요청을 되찾는 훅(스펙 §3-5 백그라운드 생성 복귀).
 *
 * 로컬스토리지의 미정리 복구 레코드를 구독해, 원 요청이 진행 중이지 않은데 레코드가
 * 남아 있으면(재진입·네트워크 유실 복귀) 복구 조회를 폴링하고 상태별 콜백으로 화면
 * 복원을 위임한다. 원 응답과 복구 조회가 경합해도 레코드 제거 선점
 * (takePendingCreationRequest)을 통과한 쪽만 결과를 반영하므로 부수효과가 이중
 * 실행되지 않는다. 폴링은 문서 가시성 구독으로 백그라운드에서 명시적으로
 * 멈췄다가 복귀 시 재개된다.
 *
 * @param args 보류 조건과 단계·상태별 화면 복원 콜백
 * @returns 복구 진행 중 단계(recoveringStage — 없으면 null)
 */
export function useCreationRequestRecovery({
  suspended,
  ...callbacks
}: UseCreationRequestRecoveryArgs) {
  const rawRecord = useSyncExternalStore(
    subscribePendingCreationRequest,
    getPendingCreationRequestSnapshot,
    getServerPendingCreationRequestSnapshot,
  );
  const storedRecord = parsePendingCreationRequest(rawRecord);
  const isPageVisible = useSyncExternalStore(
    subscribePageVisibility,
    getPageVisibilitySnapshot,
    getServerPageVisibilitySnapshot,
  );
  // 편집 draft 레코드는 서버에 조회할 것이 없으므로 복구 대상에서 제외한다.
  const inFlightRecord =
    storedRecord?.stage === 'STORYLINE_GENERATION' ||
    storedRecord?.stage === 'STORY_COMPLETION'
      ? storedRecord
      : null;
  const activeRecord = suspended || !isPageVisible ? null : inFlightRecord;

  const callbacksRef = useRef(callbacks);
  const restoredRequestIdRef = useRef<string | null>(null);
  const handledCompletedStoryRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  // 새 레코드로 복구가 시작되면 해당 단계 로딩 화면을 한 번만 복원한다.
  const activeRequestId = activeRecord?.requestId ?? null;

  useEffect(() => {
    if (activeRequestId === null) {
      return;
    }

    if (restoredRequestIdRef.current === activeRequestId) {
      return;
    }

    restoredRequestIdRef.current = activeRequestId;

    const record = parsePendingCreationRequest(
      getPendingCreationRequestSnapshot(),
    );

    if (
      record?.requestId === activeRequestId &&
      (record.stage === 'STORYLINE_GENERATION' ||
        record.stage === 'STORY_COMPLETION')
    ) {
      callbacksRef.current.onRestorePending(record);
    }
  }, [activeRequestId]);

  const recoveryQuery = useGetCreationRequest(activeRequestId ?? '', {
    query: {
      enabled: activeRequestId !== null,
      refetchInterval: RECOVERY_POLL_INTERVAL_MS,
      retry: false,
      staleTime: 0,
      gcTime: 0,
    },
  });

  const { data: recoveryData, error: recoveryError } = recoveryQuery;

  // 조회 결과를 화면 복원 액션으로 옮긴다. 레코드 제거는 스토리지 구독을 통해
  // activeRecord를 비워 폴링을 함께 멈춘다.
  useEffect(() => {
    if (!activeRecord || !recoveryData || recoveryData.status !== 200) {
      return;
    }

    const action = resolveCreationRecovery(
      activeRecord.stage,
      recoveryData.data,
    );

    if (action.type === 'pending') {
      return;
    }

    if (action.type === 'storylines-completed') {
      // 원 응답이 먼저 레코드를 교체했으면 결과 반영을 건너뛴다.
      if (!takePendingCreationRequest(activeRecord.requestId)) {
        return;
      }

      callbacksRef.current.onStorylinesCompleted(activeRecord, action.result);
    } else if (action.type === 'story-completed') {
      // 채팅 생성에 실패하면 같은 완성 레코드로 새로고침 복구를 이어야 하므로
      // 채팅 성공 전에는 슬롯을 소비하지 않는다. 같은 마운트의 중복 실행만 막는다.
      if (
        handledCompletedStoryRequestIdRef.current === activeRecord.requestId
      ) {
        return;
      }

      handledCompletedStoryRequestIdRef.current = activeRecord.requestId;
      callbacksRef.current.onStoryCompleted(activeRecord, action.result);
    } else {
      if (!takePendingCreationRequest(activeRecord.requestId)) {
        return;
      }

      callbacksRef.current.onFailed(activeRecord);
    }
  }, [activeRecord, recoveryData]);

  // 404(미존재·타인)는 되찾을 수 없으므로 레코드를 지우고 실패 처리로 합류한다.
  // 그 외 오류(네트워크·5xx)는 레코드를 유지한 채 폴링을 계속한다.
  useEffect(() => {
    if (!activeRecord || !recoveryError) {
      return;
    }

    if (recoveryError instanceof FetchError && recoveryError.status === 404) {
      if (takePendingCreationRequest(activeRecord.requestId)) {
        callbacksRef.current.onFailed(activeRecord);
      }
    }
  }, [activeRecord, recoveryError]);

  return {
    recoveringStage: activeRecord?.stage ?? null,
  };
}
