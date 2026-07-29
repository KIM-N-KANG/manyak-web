import * as Sentry from '@sentry/nextjs';

import { FetchError } from '@/lib/api-error';
import { redactShareId } from '@/lib/shares/share-url-redaction';

/** 이 미만(4xx)은 사용자가 복구할 수 있는 검증 오류로 보고 Sentry로 보내지 않는다(스펙 §AN-2-8). */
const SERVER_ERROR_STATUS = 500;

/** Sentry 상관 키로 올릴 분석 프로퍼티(스펙 §AN-2-8 Tags). */
const CORRELATION_TAG_KEYS = [
  'screen_name',
  'story_id',
  'chat_id',
  'creation_id',
] as const;

/** 사용자 취소·페이지 이탈·외부 스크립트에서 유입되는 노이즈는 수집하지 않는다. */
export const SENTRY_IGNORE_ERRORS: (string | RegExp)[] = [
  'AbortError',
  'The operation was aborted',
  'The user aborted a request',
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
];

/**
 * 사용자가 취소했거나 페이지를 떠나며 발생한 정상적인 요청 중단인지 판별한다.
 *
 * @param error 판별할 오류 값
 * @returns 요청 중단(AbortError) 여부
 */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * 사용자가 복구할 수 있는 4xx 검증 오류인지 판별한다(스펙 §AN-2-8).
 *
 * @param error 판별할 오류 값
 * @returns 복구 가능한 4xx 클라이언트 오류 여부
 */
function isRecoverableClientError(error: unknown): boolean {
  return error instanceof FetchError && error.status < SERVER_ERROR_STATUS;
}

/**
 * API 호출 실패를 Sentry로 보낸다.
 * 네트워크 오류와 5xx만 캡처하고, 복구 가능한 4xx와 요청 중단은 무시한다(스펙 §AN-2-8).
 *
 * @param error 캡처할 오류 값
 * @param context 요청 url과 method를 담은 컨텍스트
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
 * 경로로 유입되는 복구 가능한 4xx 응답을 최종적으로 걸러내고, 남는 이벤트에서 공유
 * 열람 토큰을 가린다.
 *
 * 공유 열람 화면(`/share/{shareId}`)에서 오류가 나면 Sentry가 request URL·breadcrumb에
 * 주소를 그대로 싣는데, shareId는 곧 열람 수단이라 그대로 두면 관측 저장소에서 비공개
 * 대화로 들어갈 수 있다(6-analytics.md §6-4-2-14).
 *
 * @param event Sentry로 전송될 오류 이벤트
 * @param hint 원본 예외 등을 담은 이벤트 힌트
 * @returns 전송할 이벤트, 복구 가능한 4xx면 null
 */
export function dropRecoverableApiError(
  event: Sentry.ErrorEvent,
  hint: Sentry.EventHint,
): Sentry.ErrorEvent | null {
  if (isRecoverableClientError(hint.originalException)) return null;

  if (event.request?.url) {
    event.request.url = redactShareId(event.request.url);
  }

  if (typeof event.tags?.api_url === 'string') {
    event.tags.api_url = redactShareId(event.tags.api_url);
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) =>
      breadcrumb.data?.url && typeof breadcrumb.data.url === 'string'
        ? {
            ...breadcrumb,
            data: {
              ...breadcrumb.data,
              url: redactShareId(breadcrumb.data.url),
            },
          }
        : breadcrumb,
    );
  }

  return event;
}

/**
 * Amplitude device_id를 Sentry 사용자로 연결한다(스펙 §AN-2-8 User).
 *
 * @param deviceId Sentry 사용자로 연결할 Amplitude device_id
 */
export function identifyUser(deviceId: string | undefined): void {
  if (!deviceId) return;

  Sentry.setUser({ id: deviceId });
}

/**
 * 분석 행동 이벤트를 Sentry breadcrumb로 남기고 상관 키를 tag로 올린다
 * (스펙 §AN-2-8 Breadcrumb·Tags). payload는 §AN-2-9에 따라 원문이 없는 값만 담긴다.
 *
 * @param name breadcrumb 메시지로 남길 이벤트 이름
 * @param payload breadcrumb 데이터와 상관 태그로 올릴 분석 프로퍼티
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

  // 상관 태그는 client scope에 누적되므로, 현재 payload에 없는 키는 undefined로
  // 비워 이전 화면의 값(예: 떠나온 chat_id)이 이후 에러에 남지 않게 한다.
  for (const key of CORRELATION_TAG_KEYS) {
    const value = payload[key];
    const isTaggable = typeof value === 'string' || typeof value === 'number';

    Sentry.setTag(key, isTaggable ? value : undefined);
  }
}
