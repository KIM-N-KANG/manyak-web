'use client';

import { useSyncExternalStore } from 'react';

import { IS_PUSH_ENABLED } from '@/lib/push/config';

import {
  isIosDevice,
  isStandaloneDisplay,
  PUSH_PERMISSION_EVENT,
  readNotificationPermission,
  resolvePushPromptState,
} from '../utils/push-permission';

type PushPromptState = ReturnType<typeof resolvePushPromptState>;

/**
 * 권한 변경 이벤트를 구독한다.
 *
 * @param listener 변경 시 호출할 콜백
 * @returns 구독 해제 함수
 */
function subscribe(listener: () => void): () => void {
  window.addEventListener(PUSH_PERMISSION_EVENT, listener);

  return () => window.removeEventListener(PUSH_PERMISSION_EVENT, listener);
}

/**
 * 현재 브라우저의 프롬프트 상태를 읽는다.
 *
 * @returns 프롬프트 상태
 */
function getSnapshot(): PushPromptState {
  if (!IS_PUSH_ENABLED) {
    return 'unsupported';
  }

  return resolvePushPromptState({
    permission: readNotificationPermission(),
    isIos: isIosDevice(),
    isStandalone: isStandaloneDisplay(),
  });
}

/**
 * 서버 렌더 스냅샷. 브라우저 상태를 알 수 없어 지원 안 함으로 두고 하이드레이션 뒤
 * 실제 값으로 바뀐다.
 *
 * @returns `unsupported`
 */
function getServerSnapshot(): PushPromptState {
  return 'unsupported';
}

/**
 * 알림 권한·iOS 설치 여부를 합친 프롬프트 상태를 구독한다. 권한 요청 뒤 이벤트로 갱신된다.
 *
 * @returns `prompt` · `install` · `granted` · `denied` · `unsupported`
 */
export function usePushPromptState(): PushPromptState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
