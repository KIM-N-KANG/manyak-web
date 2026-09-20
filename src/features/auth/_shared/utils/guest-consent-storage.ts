import {
  GUEST_CONSENT_STORAGE_KEY,
  GUEST_CONSENT_VERSION,
} from '@/features/auth/_shared/constants/guest-consent';

// ponytail: 저장소가 차단된 경우 현재 페이지에서만 유지한다. 서버 동의 API가 제공되면 서버 기록으로 교체한다.
let memoryConsent = false;

/**
 * 현재 버전의 유효한 동의 기록인지 검사한다.
 * @param raw 저장된 JSON 문자열
 * @returns 현재 버전과 동의 시각이 유효한지 여부
 */
export function isValidGuestConsent(raw: string | null): boolean {
  if (!raw) return false;

  try {
    const record: unknown = JSON.parse(raw);

    return (
      typeof record === 'object' &&
      record !== null &&
      'version' in record &&
      record.version === GUEST_CONSENT_VERSION &&
      'acceptedAt' in record &&
      typeof record.acceptedAt === 'string' &&
      Number.isFinite(Date.parse(record.acceptedAt))
    );
  } catch {
    return false;
  }
}

/**
 * 매 동작에서 다시 읽어 다른 탭의 동의 또는 삭제도 반영한다.
 * @returns 게스트 동의 완료 여부
 */
export function hasGuestConsent(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return (
      isValidGuestConsent(
        window.localStorage.getItem(GUEST_CONSENT_STORAGE_KEY),
      ) || memoryConsent
    );
  } catch {
    return memoryConsent;
  }
}

/** 게스트 동의 버전과 시각을 저장한다. */
export function recordGuestConsent(): void {
  try {
    window.localStorage.setItem(
      GUEST_CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: GUEST_CONSENT_VERSION,
        acceptedAt: new Date().toISOString(),
      }),
    );
    memoryConsent = false;
  } catch {
    memoryConsent = true;
  }
}
