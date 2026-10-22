import { describe, expect, it } from 'vitest';

import { calcChatTurnCost } from '@/features/chats/room/utils/chat-turn-cost';

const policy = { turnCost: 20, chatImageCost: 60 };

describe('calcChatTurnCost', () => {
  it('턴·이미지 체험이 남고 실시간을 켜면 정가 80에 적용가 0이다', () => {
    expect(
      calcChatTurnCost({
        ...policy,
        withRealtimeImage: true,
        turnRemaining: 3,
        imageRemaining: 2,
      }),
    ).toEqual({ full: 80, discounted: 0 });
  });

  it('턴·이미지 체험이 남고 실시간을 끄면 정가 20에 적용가 0이다', () => {
    expect(
      calcChatTurnCost({
        ...policy,
        withRealtimeImage: false,
        turnRemaining: 3,
        imageRemaining: 2,
      }),
    ).toEqual({ full: 20, discounted: 0 });
  });

  it('이미지 체험만 남고 실시간을 켜면 정가 80에 적용가 20이다', () => {
    expect(
      calcChatTurnCost({
        ...policy,
        withRealtimeImage: true,
        turnRemaining: 0,
        imageRemaining: 2,
      }),
    ).toEqual({ full: 80, discounted: 20 });
  });

  it('이미지 체험만 남고 실시간을 끄면 정가·적용가 모두 20이다', () => {
    expect(
      calcChatTurnCost({
        ...policy,
        withRealtimeImage: false,
        turnRemaining: 0,
        imageRemaining: 2,
      }),
    ).toEqual({ full: 20, discounted: 20 });
  });

  it('무제한(null) 체험은 무료로 본다', () => {
    expect(
      calcChatTurnCost({
        ...policy,
        withRealtimeImage: true,
        turnRemaining: null,
        imageRemaining: 0,
      }),
    ).toEqual({ full: 80, discounted: 60 });
  });

  it('정책값을 못 받으면 둘 다 undefined다', () => {
    expect(
      calcChatTurnCost({
        turnCost: undefined,
        chatImageCost: 60,
        withRealtimeImage: false,
        turnRemaining: 3,
        imageRemaining: 3,
      }),
    ).toEqual({ full: undefined, discounted: undefined });
    expect(
      calcChatTurnCost({
        turnCost: 20,
        chatImageCost: undefined,
        withRealtimeImage: true,
        turnRemaining: 3,
        imageRemaining: 3,
      }),
    ).toEqual({ full: undefined, discounted: undefined });
  });

  it('실시간을 끄면 이미지 정책값·잔여가 없어도 계산한다', () => {
    expect(
      calcChatTurnCost({
        turnCost: 20,
        chatImageCost: undefined,
        withRealtimeImage: false,
        turnRemaining: 0,
        imageRemaining: undefined,
      }),
    ).toEqual({ full: 20, discounted: 20 });
  });

  it('잔여 응답 전이면 정가만 있고 적용가는 undefined다', () => {
    expect(
      calcChatTurnCost({
        ...policy,
        withRealtimeImage: true,
        turnRemaining: undefined,
        imageRemaining: 3,
      }),
    ).toEqual({ full: 80, discounted: undefined });
    expect(
      calcChatTurnCost({
        ...policy,
        withRealtimeImage: true,
        turnRemaining: 3,
        imageRemaining: undefined,
      }),
    ).toEqual({ full: 80, discounted: undefined });
  });

  it('턴 체험이 남으면 고른 모델 가격과 무관하게 턴은 무료다', () => {
    expect(
      calcChatTurnCost({
        turnCost: 50,
        chatImageCost: 60,
        withRealtimeImage: true,
        turnRemaining: 3,
        imageRemaining: 0,
      }),
    ).toEqual({ full: 110, discounted: 60 });
  });
});
