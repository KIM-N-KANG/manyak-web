'use client';

/**
 * 게스트가 채팅방에서 입력하다 로그인 시트를 연 시점의 입력 초안을 보관하는 sessionStorage 키
 * 접두사. 같은 탭에서 OAuth를 다녀온 뒤 입력을 그대로 되살린다. 텍스트만 저장하고 입력
 * 모드는 기존 로컬 설정을 따른다(블럭 모드는 본문을 파싱해 블럭으로 복원).
 */
const CHAT_LOGIN_DRAFT_STORAGE_KEY_PREFIX = 'manyak:chat-login-draft:';

/**
 * 채팅방별 초안 저장 키를 만든다.
 *
 * @param chatId 채팅 ID
 * @returns sessionStorage 키
 */
export function buildChatLoginDraftKey(chatId: string): string {
  return `${CHAT_LOGIN_DRAFT_STORAGE_KEY_PREFIX}${chatId}`;
}

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
 * 로그인 시트를 열기 직전의 입력 본문을 저장한다. 비어 있으면 기존 초안을 지운다.
 *
 * @param chatId 채팅 ID
 * @param text 직렬화한 입력 본문
 */
export function saveChatLoginDraft(chatId: string, text: string): void {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  if (text.trim()) {
    storage.setItem(buildChatLoginDraftKey(chatId), text);
  } else {
    storage.removeItem(buildChatLoginDraftKey(chatId));
  }
}

/**
 * 저장된 입력 초안을 읽는다.
 *
 * @param chatId 채팅 ID
 * @returns 초안 본문, 없으면 null
 */
export function readChatLoginDraft(chatId: string): string | null {
  return getSessionStorage()?.getItem(buildChatLoginDraftKey(chatId)) ?? null;
}

/**
 * 저장된 입력 초안을 지운다(복원 뒤).
 *
 * @param chatId 채팅 ID
 */
export function clearChatLoginDraft(chatId: string): void {
  getSessionStorage()?.removeItem(buildChatLoginDraftKey(chatId));
}
