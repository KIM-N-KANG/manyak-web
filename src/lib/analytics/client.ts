import * as amplitude from '@amplitude/unified';

import { recordAnalyticsBreadcrumb } from '@/lib/monitoring/sentry';

import { IS_ANALYTICS_ENABLED } from './config';
import type { AnalyticsEventName, AnalyticsEventProps } from './events';

export function deriveScreenName(name: AnalyticsEventName): string {
  return name.split('_')[1];
}

type TrackArgs<K extends AnalyticsEventName> =
  AnalyticsEventProps[K] extends void ? [] : [props: AnalyticsEventProps[K]];

export function track<K extends AnalyticsEventName>(
  name: K,
  ...args: TrackArgs<K>
): void {
  const props = (args[0] ?? {}) as Record<string, unknown>;
  const payload = { ...props, screen_name: deriveScreenName(name) };

  // 사용자 행동 흐름과 상관 키를 Sentry에 남겨 에러 재현을 돕는다(스펙 §AN-2-8).
  recordAnalyticsBreadcrumb(name, payload);

  if (IS_ANALYTICS_ENABLED) {
    amplitude.track(name, payload);
  } else {
    console.debug('[analytics]', name, payload);
  }
}
