import { describe, expect, it } from 'vitest';

import { createInitialScrollSettleTracker } from '@/features/chats/room/lib/initial-scroll-settle';

describe('createInitialScrollSettleTracker', () => {
  it('첫 프레임은 맨 아래에 있어도 정착으로 판정하지 않는다', () => {
    const isSettled = createInitialScrollSettleTracker();

    // content-visibility 추정 높이 기준 맨 끝 (실측: 2078 = 2720 - 642)
    expect(
      isSettled({ scrollTop: 2078, scrollHeight: 2720, clientHeight: 642 }),
    ).toBe(false);
  });

  it('직전 프레임과 scrollHeight가 같고 맨 아래면 정착으로 판정한다', () => {
    const isSettled = createInitialScrollSettleTracker();

    isSettled({ scrollTop: 2078, scrollHeight: 2720, clientHeight: 642 });
    // 실제 높이 렌더링으로 scrollHeight가 튄 프레임 → 아직 불안정
    expect(
      isSettled({ scrollTop: 2078, scrollHeight: 9710, clientHeight: 642 }),
    ).toBe(false);
    // 맨 끝 재보정 + 높이 안정 → 정착
    expect(
      isSettled({ scrollTop: 9068, scrollHeight: 9710, clientHeight: 642 }),
    ).toBe(true);
  });

  it('높이가 안정돼도 맨 아래가 아니면 정착으로 판정하지 않는다', () => {
    const isSettled = createInitialScrollSettleTracker();

    isSettled({ scrollTop: 2078, scrollHeight: 9710, clientHeight: 642 });
    expect(
      isSettled({ scrollTop: 2078, scrollHeight: 9710, clientHeight: 642 }),
    ).toBe(false);
  });

  it('콘텐츠가 뷰포트보다 짧으면 scrollTop 0에서도 정착으로 판정한다', () => {
    const isSettled = createInitialScrollSettleTracker();

    isSettled({ scrollTop: 0, scrollHeight: 400, clientHeight: 642 });
    expect(
      isSettled({ scrollTop: 0, scrollHeight: 400, clientHeight: 642 }),
    ).toBe(true);
  });

  it('임계값 이내의 서브픽셀 오차는 맨 아래로 간주한다', () => {
    const isSettled = createInitialScrollSettleTracker();

    isSettled({ scrollTop: 9065, scrollHeight: 9710, clientHeight: 642 });
    expect(
      isSettled({ scrollTop: 9065, scrollHeight: 9710, clientHeight: 642 }),
    ).toBe(true);
  });
});
