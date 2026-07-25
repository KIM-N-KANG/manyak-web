'use client';

import { type PropsWithChildren, useEffect } from 'react';

import * as amplitude from '@amplitude/unified';

import {
  ANALYTICS_API_KEY,
  APP_VERSION,
  IS_ANALYTICS_ENABLED,
} from '@/observability/analytics/config';
import { handoffRedactionPlugin } from '@/observability/analytics/handoff-redaction';
import { identifyUser } from '@/observability/monitoring/sentry';

let initialized = false;

export function AmplitudeProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    if (!IS_ANALYTICS_ENABLED || initialized || !ANALYTICS_API_KEY) return;

    initialized = true;

    void (async () => {
      amplitude.add(handoffRedactionPlugin);

      await amplitude.initAll(ANALYTICS_API_KEY, {
        analytics: {
          appVersion: APP_VERSION,
          autocapture: {
            pageViews: true,
            sessions: true,
            attribution: true,
            elementInteractions: false,
            formInteractions: false,
            fileDownloads: false,
          },
        },
        sessionReplay: { sampleRate: 0 },
      });

      identifyUser(amplitude.getDeviceId());
    })();
  }, []);

  return children;
}
