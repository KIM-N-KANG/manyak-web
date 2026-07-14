import * as Sentry from '@sentry/nextjs';

/**
 * 런타임 환경에 맞는 Sentry 서버·엣지 설정을 동적으로 로드한다.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
