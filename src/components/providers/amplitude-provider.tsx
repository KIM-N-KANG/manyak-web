'use client';

import { type PropsWithChildren, useEffect } from 'react';

import * as amplitude from '@amplitude/unified';

import {
  ANALYTICS_API_KEY,
  APP_VERSION,
  IS_ANALYTICS_ENABLED,
} from '@/observability/analytics/config';
import { shareIdRedactionPlugin } from '@/observability/analytics/share-id-redaction';
import { identifyUser } from '@/observability/monitoring/sentry';

/** StrictMode의 이중 effect와 재마운트에서 Amplitude를 두 번 초기화하지 않도록 막는 모듈 가드다. */
let initialized = false;

/**
 * 분석이 켜진 환경에서 Amplitude를 한 번 초기화하고 자식을 그대로 그린다.
 *
 * @remarks
 * 공유 열람 경로의 토큰을 지우는 플러그인은 초기 페이지뷰까지 덮도록 `initAll` 전에 등록한다.
 * autocapture는 페이지뷰, 세션, 유입 경로만 켜고 요소, 폼 상호작용과 파일 다운로드는 끄며,
 * 세션 리플레이는 표본 0으로 둔다. 초기화가 끝나면 Amplitude device_id를 Sentry 사용자로 연결한다.
 */
export function AmplitudeProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    if (!IS_ANALYTICS_ENABLED || initialized || !ANALYTICS_API_KEY) return;

    initialized = true;

    void (async () => {
      amplitude.add(shareIdRedactionPlugin);

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
