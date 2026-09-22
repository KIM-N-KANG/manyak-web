'use client';

import { unregister } from '@/api/generated/endpoints/push/push';
import { discardPushToken } from '@/lib/push/messaging';

import {
  clearRegisteredPushToken,
  readRegisteredPushToken,
} from './push-token-storage';

/**
 * 이 기기의 FCM 토큰을 서버와 브라우저에서 지운다. 세션 종료 정리에서 fire-and-forget으로
 * 부르며 실패는 무시한다 — 서버 토큰 삭제는 소유자 조건부라 늦게 도착해도 남의 토큰을
 * 지우지 않고, 남은 토큰은 다음 발송의 `recipientId` 대조·UNREGISTERED 정리가 덮는다.
 *
 * 세션 쿠키가 아직 살아 있는 동안 호출해야 서버 삭제가 인증을 통과한다. 호출부는 이
 * 함수 뒤에 `signOut`을 부른다.
 */
export function revokePushToken(): void {
  const token = readRegisteredPushToken();

  clearRegisteredPushToken();

  if (token) {
    void unregister({ token }).catch(() => undefined);
  }

  void discardPushToken();
}
