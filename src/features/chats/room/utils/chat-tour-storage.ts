import { CHAT_TOUR_SEEN_STORAGE_KEY, CHAT_TOUR_SEEN_VALUE } from '../constants';

/**
 * 로컬스토리지에 저장된 값이 채팅 화면 안내 투어를 본 상태인지 파싱한다.
 *
 * @param value 로컬스토리지에서 읽은 값(없으면 null)
 * @returns 투어를 본 상태이면 true
 */
export function parseChatTourSeen(value: string | null): boolean {
  return value === CHAT_TOUR_SEEN_VALUE;
}

/**
 * 채팅 화면 안내 투어를 이미 봤는지 반환한다.
 * 서버 렌더링 시점에는 localStorage가 없으므로 "봤음(true)"으로 간주해
 * 자동 노출이 일어나지 않도록 한다.
 *
 * @returns 투어를 이미 봤으면 true
 */
export function isChatTourSeen(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    return parseChatTourSeen(
      window.localStorage.getItem(CHAT_TOUR_SEEN_STORAGE_KEY),
    );
  } catch {
    return false;
  }
}

/** 투어를 봤다는 사실을 로컬스토리지에 기록한다. */
export function markChatTourSeen(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      CHAT_TOUR_SEEN_STORAGE_KEY,
      CHAT_TOUR_SEEN_VALUE,
    );
  } catch {
    // 프라이빗 모드 등 localStorage 차단 환경에서는 저장을 건너뛴다.
  }
}
