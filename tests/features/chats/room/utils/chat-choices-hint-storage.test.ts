import { describe, expect, it } from 'vitest';

import {
  isChatChoicesHintSeen,
  parseChatChoicesHintSeen,
} from '@/features/chats/room/utils/chat-choices-hint-storage';

describe('parseChatChoicesHintSeen', () => {
  it('저장 값이 열람 값이면 열람 상태로 판정한다', () => {
    expect(parseChatChoicesHintSeen('true')).toBe(true);
  });

  it('값이 없거나 다른 값이면 미열람으로 판정한다', () => {
    expect(parseChatChoicesHintSeen(null)).toBe(false);
    expect(parseChatChoicesHintSeen('false')).toBe(false);
    expect(parseChatChoicesHintSeen('')).toBe(false);
  });
});

describe('isChatChoicesHintSeen', () => {
  it('window가 없는 환경(SSR·node)에서는 열람으로 간주해 노출을 막는다', () => {
    expect(isChatChoicesHintSeen()).toBe(true);
  });
});
