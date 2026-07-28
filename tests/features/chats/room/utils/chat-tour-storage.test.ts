import { describe, expect, it } from 'vitest';

import {
  isChatTourSeen,
  parseChatTourSeen,
} from '@/features/chats/room/utils/chat-tour-storage';

describe('parseChatTourSeen', () => {
  it('저장 값이 열람 값이면 열람 상태로 판정한다', () => {
    expect(parseChatTourSeen('true')).toBe(true);
  });

  it('값이 없거나 다른 값이면 미열람으로 판정한다', () => {
    expect(parseChatTourSeen(null)).toBe(false);
    expect(parseChatTourSeen('false')).toBe(false);
    expect(parseChatTourSeen('')).toBe(false);
  });
});

describe('isChatTourSeen', () => {
  it('window가 없는 환경(SSR·node)에서는 열람으로 간주해 자동 노출을 막는다', () => {
    expect(isChatTourSeen()).toBe(true);
  });
});
