import * as Sentry from '@sentry/nextjs';

import { FetchError } from '@/lib/api-error';

// 이 미만(4xx)은 사용자가 복구할 수 있는 검증 오류로 보고 Sentry로 보내지 않는다(스펙 §AN-2-8).
const SERVER_ERROR_STATUS = 500;

// Sentry 상관 키로 올릴 분석 프로퍼티(스펙 §AN-2-8 Tags).
const CORRELATION_TAG_KEYS = [
  'screen_name',
  'story_id',
  'chat_id',
  'creation_id',
] as const;

// 사용자 취소·페이지 이탈·외부 스크립트에서 유입되는 노이즈는 수집하지 않는다.
export const SENTRY_IGNORE_ERRORS: (string | RegExp)[] = [
  'AbortError',
  'The operation was aborted',
  'The user aborted a request',
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
];

/** 사용자가 취소했거나 페이지를 떠나며 발생한 정상적인 요청 중단인지 판별한다. */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** 사용자가 복구할 수 있는 4xx 검증 오류인지 판별한다(스펙 §AN-2-8). */
function isRecoverableClientError(error: unknown): boolean {
  return error instanceof FetchError && error.status < SERVER_ERROR_STATUS;
}

/**
 * API 호출 실패를 Sentry로 보낸다.
 * 네트워크 오류와 5xx만 캡처하고, 복구 가능한 4xx와 요청 중단은 무시한다(스펙 §AN-2-8).
 */
export function captureApiError(
  error: unknown,
  context: { url: string; method?: string },
): void {
  if (isAbortError(error) || isRecoverableClientError(error)) return;

  const status = error instanceof FetchError ? error.status : undefined;

  Sentry.captureException(error, {
    tags: {
      api_url: context.url,
      ...(context.method ? { api_method: context.method } : {}),
      ...(status === undefined ? {} : { http_status: status }),
    },
  });
}

/**
 * Sentry beforeSend 훅. 자동 캡처·unhandledrejection 등 captureApiError를 거치지 않은
 * 경로로 유입되는 복구 가능한 4xx 응답을 최종적으로 걸러낸다.
 */
export function dropRecoverableApiError(
  event: Sentry.ErrorEvent,
  hint: Sentry.EventHint,
): Sentry.ErrorEvent | null {
  if (isRecoverableClientError(hint.originalException)) return null;

  return event;
}

/** Amplitude device_id를 Sentry 사용자로 연결한다(스펙 §AN-2-8 User). */
export function identifyUser(deviceId: string | undefined): void {
  if (!deviceId) return;

  Sentry.setUser({ id: deviceId });
}

/**
 * 분석 행동 이벤트를 Sentry breadcrumb로 남기고 상관 키를 tag로 올린다
 * (스펙 §AN-2-8 Breadcrumb·Tags). payload는 §AN-2-9에 따라 원문이 없는 값만 담긴다.
 */
export function recordAnalyticsBreadcrumb(
  name: string,
  payload: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({
    category: 'analytics',
    message: name,
    level: 'info',
    data: payload,
  });

  for (const key of CORRELATION_TAG_KEYS) {
    const value = payload[key];

    if (typeof value === 'string' || typeof value === 'number') {
      Sentry.setTag(key, value);
    }
  }
}
