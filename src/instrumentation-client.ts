import * as Sentry from '@sentry/nextjs';

import {
  dropRecoverableApiError,
  SENTRY_IGNORE_ERRORS,
} from '@/observability/monitoring/sentry';

const isProduction = process.env.NODE_ENV === 'production';

const enabled =
  isProduction || process.env.NEXT_PUBLIC_SENTRY_FORCE_ENABLE === 'true';

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
