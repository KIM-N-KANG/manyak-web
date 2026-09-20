'use client';

/**
 * 이전 버전에서 이 탭에만 보관한 게스트 채팅 ID의 sessionStorage 키.
 * 신규 채팅은 localStorage 서재를 사용하고 기존 탭 ID는 이관 호환을 위해 읽는다.
 */
export const GUEST_CHAT_IDS_STORAGE_KEY = 'manyak:guest-chat-ids';

/**
 * sessionStorage를 안전하게 얻는다. SSR·접근 차단 환경에서는 null이다.
 *
 * @returns 사용할 수 있는 sessionStorage 또는 null
 */
function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * 이 탭에서 게스트로 시작한 채팅 ID 목록을 읽는다. 손상된 값은 빈 목록으로 본다.
 *
 * @returns 저장 순서의 채팅 ID 목록
 */
export function readGuestChatIds(): string[] {
  const raw = getSessionStorage()?.getItem(GUEST_CHAT_IDS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

/** 이 탭의 게스트 채팅 ID 목록을 지운다(이관 평가 완료 시). */
export function clearGuestChatIds(): void {
  getSessionStorage()?.removeItem(GUEST_CHAT_IDS_STORAGE_KEY);
}
