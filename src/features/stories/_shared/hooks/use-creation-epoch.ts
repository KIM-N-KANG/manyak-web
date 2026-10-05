'use client';

import { useSyncExternalStore } from 'react';

import {
  getCreationEpoch,
  subscribeCreationEpoch,
} from '@/features/stories/_shared/utils/creation-db';

/** 세션 종료를 다른 탭과 현재 탭의 제작 구독에 함께 반영한다. */
export function useCreationEpoch() {
  return useSyncExternalStore(
    subscribeCreationEpoch,
    getCreationEpoch,
    () => 0,
  );
}
