'use client';

/**
 * 게스트가 상세에서 시작한 채팅 ID를 이 탭에만 보관하는 sessionStorage 키.
 *
 * 게스트 채팅은 채팅 목록(localStorage 서재)에 남기지 않는다. 대신 같은 탭에서 로그인하고
 * 돌아왔을 때 자동 이관과 인앱 핸드오프에 실어 계정으로 옮기기 위해 탭 안에서만 기억한다.
 * 탭을 닫으면 사라지며, 다른 탭·다음 방문에서는 접근할 수 없다.
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

/**
 * 게스트로 시작한 채팅 ID를 이 탭에 추가한다. 이미 있으면 그대로 둔다.
 *
 * @param chatId 추가할 채팅 ID
 */
export function saveGuestChatId(chatId: string): void {
  const current = readGuestChatIds();

  if (current.includes(chatId)) {
    return;
  }

  getSessionStorage()?.setItem(
    GUEST_CHAT_IDS_STORAGE_KEY,
    JSON.stringify([...current, chatId]),
  );
}

/** 이 탭의 게스트 채팅 ID 목록을 지운다(이관 평가 완료 시). */
export function clearGuestChatIds(): void {
  getSessionStorage()?.removeItem(GUEST_CHAT_IDS_STORAGE_KEY);
}
