import { describe, expect, it } from 'vitest';

import {
  PENDING_CHAT_OPEN_TTL_MS,
  readPendingChatOpen,
} from '@/features/stories/_shared/utils/pending-chat-open';

const raw = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ storyId: 's1', chatId: 'c1', at: 1_000, ...overrides });

describe('readPendingChatOpen', () => {
  it('같은 스토리의 유효한 의도면 채팅 id를 돌려준다', () => {
    expect(
      readPendingChatOpen(raw(), 's1', 1_000 + PENDING_CHAT_OPEN_TTL_MS),
    ).toBe('c1');
  });

  it('다른 스토리, 만료, 깨진 값, 빈 값은 null이다', () => {
    expect(readPendingChatOpen(raw(), 's2', 1_000)).toBeNull();
    expect(
      readPendingChatOpen(raw(), 's1', 1_000 + PENDING_CHAT_OPEN_TTL_MS + 1),
    ).toBeNull();
    expect(readPendingChatOpen(raw({ chatId: 3 }), 's1', 1_000)).toBeNull();
    expect(readPendingChatOpen('{', 's1', 1_000)).toBeNull();
    expect(readPendingChatOpen(null, 's1', 1_000)).toBeNull();
  });
});
