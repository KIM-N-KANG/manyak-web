import * as amplitude from '@amplitude/unified';

import { recordAnalyticsBreadcrumb } from '@/observability/monitoring/sentry';

import { IS_ANALYTICS_ENABLED } from './config';
import type { AnalyticsEventName, AnalyticsEventProps } from './events';

/** 이벤트 이름(client_{screen}_...)에서 screen_name을 추출한다. */
export function deriveScreenName(name: AnalyticsEventName): string {
  return name.split('_')[1];
}

type TrackArgs<K extends AnalyticsEventName> =
  AnalyticsEventProps[K] extends void ? [] : [props: AnalyticsEventProps[K]];

type AnalyticsUserContext = { is_logged_in: boolean; user_id?: string };

let userContext: AnalyticsUserContext = { is_logged_in: false };

/**
 * 로그인 성공 시 Amplitude user_id를 설정하고 공통 프로퍼티(is_logged_in·user_id)를
 * 이후 모든 이벤트에 붙인다(스펙 §6-2 — device_id는 유지, alias 미사용).
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

/**
 * 분석 이벤트를 전송한다. screen_name을 자동으로 붙이고 Sentry breadcrumb도 함께 남기며,
 * 분석이 비활성화된 환경에서는 Amplitude 전송 대신 콘솔 디버그 로그로 대체한다.
 */
export function track<K extends AnalyticsEventName>(
  name: K,
  ...args: TrackArgs<K>
): void {
  const props = (args[0] ?? {}) as Record<string, unknown>;
  const payload = {
    ...props,
    ...userContext,
    screen_name: deriveScreenName(name),
  };

  // 사용자 행동 흐름과 상관 키를 Sentry에 남겨 에러 재현을 돕는다(스펙 §AN-2-8).
  recordAnalyticsBreadcrumb(name, payload);

  if (IS_ANALYTICS_ENABLED) {
    amplitude.track(name, payload);
  } else {
    console.debug('[analytics]', name, payload);
  }
}
