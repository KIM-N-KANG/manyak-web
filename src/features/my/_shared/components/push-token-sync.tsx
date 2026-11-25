'use client';

import { usePushTokenSync } from '../hooks/use-push-token-sync';

/** 아무것도 그리지 않고 푸시 토큰 동기화(`usePushTokenSync`)만 실행하는 마운트 전용 컴포넌트. */
export function PushTokenSync() {
  usePushTokenSync();

  return null;
}
