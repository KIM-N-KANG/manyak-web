import { describe, expect, it } from 'vitest';

import { shouldAutoOpenChatTour } from '@/features/chats/room/utils/chat-tour-gate';

describe('shouldAutoOpenChatTour', () => {
  const base = { isReady: true, turnCount: 0, isStreaming: false, seen: false };

  it('로딩 완료·턴 0개·비스트리밍·미열람이면 연다', () => {
    expect(shouldAutoOpenChatTour(base)).toBe(true);
  });

  it('이미 봤으면 열지 않는다', () => {
    expect(shouldAutoOpenChatTour({ ...base, seen: true })).toBe(false);
  });

  it('턴이 있으면 열지 않는다', () => {
    expect(shouldAutoOpenChatTour({ ...base, turnCount: 1 })).toBe(false);
  });

  it('스트리밍 중이거나 로딩 전이면 열지 않는다', () => {
    expect(shouldAutoOpenChatTour({ ...base, isStreaming: true })).toBe(false);
    expect(shouldAutoOpenChatTour({ ...base, isReady: false })).toBe(false);
  });
});
