import * as amplitude from '@amplitude/unified';

import { recordAnalyticsBreadcrumb } from '@/observability/monitoring/sentry';

import { IS_ANALYTICS_ENABLED } from './config';
import type { AnalyticsEventName, AnalyticsEventProps } from './events';
import { getAnalyticsUserContext } from './user-context';

/** 이벤트 이름(client_{screen}_...)에서 screen_name을 추출한다. */
export function deriveScreenName(name: AnalyticsEventName): string {
  return name.split('_')[1];
}

type TrackArgs<K extends AnalyticsEventName> =
  AnalyticsEventProps[K] extends void ? [] : [props: AnalyticsEventProps[K]];

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
    ...getAnalyticsUserContext(),
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
