// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

import {
  dropRecoverableApiError,
  SENTRY_IGNORE_ERRORS,
} from '@/lib/monitoring/sentry';

const isProduction = process.env.NODE_ENV === 'production';

// 로컬/dev에서는 이벤트를 전송하지 않아 작업 중 에러로 대시보드가 더럽혀지지 않게 한다.
// 로컬에서 연동을 확인하려면 NEXT_PUBLIC_SENTRY_FORCE_ENABLE=true로 강제 활성화.
const enabled =
  isProduction || process.env.NEXT_PUBLIC_SENTRY_FORCE_ENABLE === 'true';

Sentry.init({
  enabled,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 이벤트를 환경/릴리스별로 구분해 노이즈를 분리한다.
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // 프로덕션은 트래픽이 많아 샘플링을 낮춘다. 로컬/dev는 전수 수집.
  tracesSampleRate: isProduction ? 0.1 : 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // 사용자 취소·페이지 이탈·외부 스크립트 노이즈는 수집하지 않는다.
  ignoreErrors: SENTRY_IGNORE_ERRORS,

  // 복구 가능한 4xx 응답은 다른 경로로 유입돼도 최종적으로 걸러낸다(스펙 §AN-2-8).
  beforeSend: dropRecoverableApiError,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
