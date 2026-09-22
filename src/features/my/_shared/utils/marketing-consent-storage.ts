'use client';

/**
 * 회원별 광고 알림 동의 질문 단계를 보관하는 localStorage 키 접두사. 값은
 * `{ stage, entriesSinceDecline }` JSON이며 키 뒤에 회원 공개 ID를 붙인다.
 *
 * Android 규칙(필수 동의 시트에서 첫 거절 뒤 세 번째 재진입에서 한 번 더, 그 뒤 닫힘)과
 * 같다. 재진입은 회원 화면이 처음 그려지는 페이지 로드 단위로 센다. 회원 귀속이라 다른
 * 계정에는 영향이 없다.
 */
export const MARKETING_CONSENT_STORAGE_KEY_PREFIX = 'manyak:marketing-consent:';

/**
 * 알림 권한을 이 기기에서 자동으로 물었는지 남기는 localStorage 키. Android의 설치 단위
 * 안내 플래그와 같은 역할이며 로그아웃에도 지우지 않는다(권한 거부는 반복 요청하지 않는다).
 */
export const PUSH_PERMISSION_ASKED_STORAGE_KEY = 'manyak:push-permission-asked';

/** 첫 거절 뒤 다시 묻기까지 필요한 회원 재진입 횟수. */
export const MARKETING_CONSENT_REASK_AFTER_ENTRIES = 3;

export type MarketingConsentRecord = {
  /** `declined-once`는 한 번 거절, `closed`는 허용했거나 두 번 거절해 더 묻지 않음. */
  stage: 'declined-once' | 'closed';
  /** 첫 거절 뒤 누적된 재진입 횟수. */
  entriesSinceDecline: number;
};

/**
 * localStorage를 안전하게 얻는다. SSR·저장소 접근 차단 환경에서는 null이다.
 *
 * @returns 사용할 수 있는 localStorage 또는 null
 */
function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * 회원의 질문 기록을 읽는다.
 *
 * @param userId 회원 공개 ID
 * @returns 기록 또는 아직 답하지 않았으면 null
 */
export function readMarketingConsentRecord(
  userId: string,
): MarketingConsentRecord | null {
  const raw = getLocalStorage()?.getItem(
    `${MARKETING_CONSENT_STORAGE_KEY_PREFIX}${userId}`,
  );

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'stage' in parsed &&
      (parsed.stage === 'declined-once' || parsed.stage === 'closed')
    ) {
      const entries =
        'entriesSinceDecline' in parsed &&
        typeof parsed.entriesSinceDecline === 'number'
          ? parsed.entriesSinceDecline
          : 0;

      return { stage: parsed.stage, entriesSinceDecline: entries };
    }
  } catch {
    // 깨진 값은 답하지 않은 것으로 본다.
  }

  return null;
}

/**
 * 회원의 질문 기록을 쓴다.
 *
 * @param userId 회원 공개 ID
 * @param record 저장할 기록
 */
export function writeMarketingConsentRecord(
  userId: string,
  record: MarketingConsentRecord,
): void {
  getLocalStorage()?.setItem(
    `${MARKETING_CONSENT_STORAGE_KEY_PREFIX}${userId}`,
    JSON.stringify(record),
  );
}

/**
 * 회원 재진입 한 번을 기록에 반영한 뒤 재질문 시트를 띄울 차례인지 판정한다. 순수 함수라
 * 저장은 호출부가 한다. 아직 답하지 않은 회원(기록 없음)은 필수 동의 시트에서 묻는
 * 대상이라 재질문하지 않는다.
 *
 * @param record 현재 기록
 * @returns 갱신된 기록과 이번 진입에서 재질문할지 여부
 */
export function advanceMarketingConsentRecord(
  record: MarketingConsentRecord | null,
): { record: MarketingConsentRecord | null; shouldReask: boolean } {
  if (record === null || record.stage === 'closed') {
    return { record, shouldReask: false };
  }

  const entriesSinceDecline = record.entriesSinceDecline + 1;

  return {
    record: { stage: 'declined-once', entriesSinceDecline },
    shouldReask: entriesSinceDecline >= MARKETING_CONSENT_REASK_AFTER_ENTRIES,
  };
}

/**
 * 질문에 답한 결과를 다음 기록으로 바꾼다. 허용은 닫힘, 거절은 첫 거절이면 재질문 대기,
 * 두 번째면 닫힘이다.
 *
 * @param record 답하기 전 기록
 * @param accepted 허용 여부
 * @returns 저장할 기록
 */
export function answerMarketingConsentRecord(
  record: MarketingConsentRecord | null,
  accepted: boolean,
): MarketingConsentRecord {
  if (accepted || record?.stage === 'declined-once') {
    return { stage: 'closed', entriesSinceDecline: 0 };
  }

  return { stage: 'declined-once', entriesSinceDecline: 0 };
}

/**
 * 이 기기에서 알림 권한을 자동으로 물은 적이 있는지 읽는다.
 *
 * @returns 물었으면 true
 */
export function hasAskedPushPermission(): boolean {
  return getLocalStorage()?.getItem(PUSH_PERMISSION_ASKED_STORAGE_KEY) === '1';
}

/** 이 기기에서 알림 권한을 물었음을 남긴다. */
export function markPushPermissionAsked(): void {
  getLocalStorage()?.setItem(PUSH_PERMISSION_ASKED_STORAGE_KEY, '1');
}
