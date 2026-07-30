import * as Sentry from '@sentry/nextjs';

import {
  dropRecoverableApiError,
  SENTRY_IGNORE_ERRORS,
} from '@/observability/monitoring/sentry';

const isProduction = process.env.NODE_ENV === 'production';

// Vercel 배포에서만 이벤트를 전송한다. NODE_ENV만 보면 로컬 프로덕션 빌드
// (pnpm build && pnpm start)의 이벤트까지 production으로 유입되기 때문이다.
// 로컬에서 연동을 확인하려면 NEXT_PUBLIC_SENTRY_FORCE_ENABLE=true로 강제 활성화.
const enabled =
  (isProduction && process.env.NEXT_PUBLIC_VERCEL_ENV !== undefined) ||
  process.env.NEXT_PUBLIC_SENTRY_FORCE_ENABLE === 'true';

Sentry.init({
  enabled,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
  integrations: [Sentry.replayIntegration()],
  tracesSampleRate: isProduction ? 0.1 : 1,
  enableLogs: true,
  ignoreErrors: SENTRY_IGNORE_ERRORS,
  beforeSend: dropRecoverableApiError,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
