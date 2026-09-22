import type {
  PushSettingsResponse,
  PushSettingsUpdateRequest,
} from '@/api/generated/models';

import type { PushConsentNoticeResult } from '../constants/push-copy';

/** 세 값이 모두 채워진 알림 설정. 서버 응답의 선택 필드를 기본값으로 메운다. */
export type PushSettings = Required<PushSettingsResponse>;

/**
 * 서버 응답을 세 값이 모두 있는 설정으로 정규화한다. 서비스 알림은 기본 켜짐,
 * 광고·야간은 기본 꺼짐이다(§4-3-5 푸시 수신 동의).
 *
 * @param response 서버 응답
 * @returns 정규화된 설정
 */
export function normalizePushSettings(
  response: PushSettingsResponse | undefined,
): PushSettings {
  return {
    servicePush: response?.servicePush ?? true,
    marketingPush: response?.marketingPush ?? false,
    marketingNightPush: response?.marketingNightPush ?? false,
  };
}

/**
 * 설정 하나를 바꾼 전체 교체 요청 본문을 만든다. PUT은 세 필드가 전부 필수이며,
 * 광고를 끄면 야간도 함께 꺼진다(서버가 야간 단독 true를 400으로 거부한다).
 *
 * @param current 현재 설정
 * @param patch 바꿀 값
 * @returns PUT 요청 본문
 */
export function buildPushSettingsUpdate(
  current: PushSettings,
  patch: Partial<PushSettings>,
): Required<PushSettingsUpdateRequest> {
  const next = { ...current, ...patch };

  if (!next.marketingPush) {
    next.marketingNightPush = false;
  }

  return next;
}

/**
 * 광고·야간 값의 변화에서 처리 결과 통지 종류를 고른다. 서비스 알림 토글은 통지하지
 * 않는다. 광고를 끄면서 야간이 함께 꺼진 경우는 광고 철회 하나로 통지한다.
 *
 * @param before 변경 전 설정
 * @param after 변경 후 설정
 * @returns 통지 종류 또는 통지 대상이 아니면 null
 */
export function resolvePushConsentNotice(
  before: PushSettings,
  after: PushSettings,
): PushConsentNoticeResult | null {
  if (before.marketingPush !== after.marketingPush) {
    return after.marketingPush ? 'marketingOn' : 'marketingOff';
  }

  if (before.marketingNightPush !== after.marketingNightPush) {
    return after.marketingNightPush ? 'nightOn' : 'nightOff';
  }

  return null;
}
