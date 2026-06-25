// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

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

  // 프로덕션은 트래픽이 많아 샘플링을 낮춘다. 로컬/dev는 전수 수집.
  tracesSampleRate: isProduction ? 0.1 : 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
