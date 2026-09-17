'use client';

import { useSyncExternalStore } from 'react';

import {
  getPendingCreationRequestSnapshot,
  getServerPendingCreationRequestSnapshot,
  getStoryCompletionRequestsSnapshot,
  parsePendingCreationRequest,
  parseStoryCompletionRequests,
  subscribePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';

/**
 * 제작 화면에서 현재 편집 슬롯(초안·스토리라인 생성)을 구독한다.
 *
 * @returns 파싱에 성공한 현재 슬롯 레코드, 없거나 유효하지 않으면 null
 */
export function usePendingCreationRequest() {
  const rawRecord = useSyncExternalStore(
    subscribePendingCreationRequest,
    getPendingCreationRequestSnapshot,
    getServerPendingCreationRequestSnapshot,
  );

  return parsePendingCreationRequest(rawRecord);
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
