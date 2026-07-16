import * as amplitude from '@amplitude/unified';

import { IS_ANALYTICS_ENABLED } from './config';

export type AnalyticsUserContext = { is_logged_in: boolean; user_id?: string };

let userContext: AnalyticsUserContext = { is_logged_in: false };

/**
 * track가 모든 이벤트에 공통으로 붙일 현재 사용자 컨텍스트를 반환한다.
 *
 * @returns 현재 사용자 컨텍스트(is_logged_in·user_id)
 */
export function getAnalyticsUserContext(): AnalyticsUserContext {
  return userContext;
}

/**
 * 로그인 성공 시 Amplitude user_id를 설정하고 공통 프로퍼티(is_logged_in·user_id)를
 * 이후 모든 이벤트에 붙인다(스펙 §6-2 — device_id는 유지, alias 미사용).
 *
 * @param userId 로그인한 사용자 ID
 */
export function setAnalyticsUser(userId: string): void {
  userContext = { is_logged_in: true, user_id: userId };

  if (IS_ANALYTICS_ENABLED) {
    amplitude.setUserId(userId);
  }
}

/**
 * 로그아웃 시 user_id를 해제하고 reset()으로 device_id를 재발급한다(스펙 §6-2 —
 * 공용 기기에서 다음 사용자의 행동이 이전 회원에게 귀속되는 것을 방지).
 */
export function resetAnalyticsUser(): void {
  userContext = { is_logged_in: false };

  if (IS_ANALYTICS_ENABLED) {
    amplitude.setUserId(undefined);
    amplitude.reset();
  }
}
