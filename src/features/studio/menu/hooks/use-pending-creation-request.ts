'use client';

import { useSyncExternalStore } from 'react';

import {
  getPendingCreationRequestSnapshot,
  getServerPendingCreationRequestSnapshot,
  getStoryCompletionRequestsSnapshot,
  parsePendingCreationRequests,
  parseStoryCompletionRequests,
  subscribePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';

/**
 * 제작 화면에서 편집 초안 목록(초안·스토리라인 생성)을 구독한다.
 *
 * @returns 파싱에 성공한 편집 초안 레코드 목록(저장 순서)
 */
export function usePendingCreationRequests() {
  const raw = useSyncExternalStore(
    subscribePendingCreationRequest,
    getPendingCreationRequestSnapshot,
    getServerPendingCreationRequestSnapshot,
  );

  return parsePendingCreationRequests(raw);
}

/**
 * 제작 화면에서 완성 요청 목록을 구독한다.
 *
 * @returns 파싱에 성공한 완성 요청 레코드 목록(저장 순서)
 */
export function useStoryCompletionRequests() {
  const raw = useSyncExternalStore(
    subscribePendingCreationRequest,
    getStoryCompletionRequestsSnapshot,
    getServerPendingCreationRequestSnapshot,
  );

  return parseStoryCompletionRequests(raw);
}
