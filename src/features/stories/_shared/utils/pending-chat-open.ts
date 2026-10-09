/**
 * 상세 자리에 채팅방을 쌓아 열어야 할 때 쓰는 "열기 의도" 저장소다.
 * 일반 제작 승인처럼 끝난 화면을 상세로 바꾼 뒤 그 위에 채팅방을 올려야 하는 흐름은, 두 이동을 연달아 부르면
 * Next가 앞의 이동을 버리므로 의도를 남기고 상세로만 바꾼다. 상세가 마운트되면(주소가 확정되면) 의도를 읽어
 * 채팅방을 연다. 탭 단위 저장소라 다른 탭에 번지지 않고, 짧은 유효 시간으로 새로고침 뒤 뜻밖에 열리지 않게 한다.
 */

export const PENDING_CHAT_OPEN_STORAGE_KEY = 'manyak:pending-chat-open';

/** 의도의 유효 시간. 상세 마운트까지의 한 번의 이동만 덮으면 된다. */
export const PENDING_CHAT_OPEN_TTL_MS = 30_000;

type PendingChatOpen = { storyId: string; chatId: string; at: number };

/**
 * 저장된 원문에서 이 스토리의 아직 유효한 열기 의도를 읽는다.
 *
 * @param raw 저장소 원문
 * @param storyId 마운트된 상세의 스토리 id
 * @param now 현재 시각(ms)
 * @returns 열어야 할 채팅 id. 없거나 다른 스토리거나 만료됐으면 null
 */
export function readPendingChatOpen(
  raw: string | null,
  storyId: string,
  now: number,
): string | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingChatOpen>;

    if (
      parsed.storyId !== storyId ||
      typeof parsed.chatId !== 'string' ||
      typeof parsed.at !== 'number' ||
      now - parsed.at > PENDING_CHAT_OPEN_TTL_MS
    ) {
      return null;
    }

    return parsed.chatId;
  } catch {
    return null;
  }
}

/**
 * 상세로 바꾼 뒤 열 채팅을 남긴다.
 *
 * @param storyId 바꿔 열 상세의 스토리 id
 * @param chatId 상세 위에 쌓을 채팅 id
 */
export function markPendingChatOpen(storyId: string, chatId: string): void {
  try {
    window.sessionStorage.setItem(
      PENDING_CHAT_OPEN_STORAGE_KEY,
      JSON.stringify({
        storyId,
        chatId,
        at: Date.now(),
      } satisfies PendingChatOpen),
    );
  } catch {
    // 저장소가 막힌 환경에서는 상세에서 멈춘다. 사용자가 상세의 CTA로 채팅을 시작할 수 있다.
  }
}

/**
 * 이 스토리의 열기 의도를 읽고 지운다. 상세가 마운트될 때 한 번 부른다.
 *
 * @param storyId 마운트된 상세의 스토리 id
 * @returns 열어야 할 채팅 id, 없으면 null
 */
export function consumePendingChatOpen(storyId: string): string | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_CHAT_OPEN_STORAGE_KEY);
    const chatId = readPendingChatOpen(raw, storyId, Date.now());

    if (raw !== null) {
      window.sessionStorage.removeItem(PENDING_CHAT_OPEN_STORAGE_KEY);
    }

    return chatId;
  } catch {
    return null;
  }
}
