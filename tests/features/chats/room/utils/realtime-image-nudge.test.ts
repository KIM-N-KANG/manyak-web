import { describe, expect, it } from 'vitest';

import {
  nextCompletedTurnCount,
  parseCompletedTurnCount,
  shouldOpenRealtimeImageNudge,
} from '@/features/chats/room/utils/realtime-image-nudge';

describe('parseCompletedTurnCount', () => {
  it('저장값이 없거나 손상됐으면 0이다', () => {
    expect(parseCompletedTurnCount(null)).toBe(0);
    expect(parseCompletedTurnCount('abc')).toBe(0);
    expect(parseCompletedTurnCount('-1')).toBe(0);
    expect(parseCompletedTurnCount('1.5')).toBe(0);
  });

  it('양의 정수는 그대로 읽는다', () => {
    expect(parseCompletedTurnCount('2')).toBe(2);
  });
});

describe('nextCompletedTurnCount', () => {
  it('기준 횟수를 한 번 넘긴 뒤에는 더 세지 않는다', () => {
    expect(nextCompletedTurnCount(0)).toBe(1);
    expect(nextCompletedTurnCount(1)).toBe(2);
    expect(nextCompletedTurnCount(2)).toBe(3);
    expect(nextCompletedTurnCount(3)).toBe(3);
  });
});

describe('shouldOpenRealtimeImageNudge', () => {
  it('두 번째 응답 완료 시점에 실시간 이미지가 꺼져 있을 때만 연다', () => {
    expect(shouldOpenRealtimeImageNudge(2, false)).toBe(true);
    expect(shouldOpenRealtimeImageNudge(2, true)).toBe(false);
    expect(shouldOpenRealtimeImageNudge(1, false)).toBe(false);
    expect(shouldOpenRealtimeImageNudge(3, false)).toBe(false);
  });
});
