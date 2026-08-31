'use client';

import { useSyncExternalStore } from 'react';

import {
  getPendingCreationRequestSnapshot,
  getServerPendingCreationRequestSnapshot,
  parsePendingCreationRequest,
  subscribePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';

/**
 * 제작 화면에서 현재 생성 복구 슬롯을 구독한다.
 *
 * @returns 파싱에 성공한 현재 복구 레코드, 없거나 유효하지 않으면 null
 */
export function usePendingCreationRequest() {
  const rawRecord = useSyncExternalStore(
    subscribePendingCreationRequest,
    getPendingCreationRequestSnapshot,
    getServerPendingCreationRequestSnapshot,
  );

  return parsePendingCreationRequest(rawRecord);
}
