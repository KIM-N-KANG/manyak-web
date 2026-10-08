import { describe, expect, it } from 'vitest';

import { remainingRefreshCycleMs } from '@/components/motion/pull-to-refresh';

describe('remainingRefreshCycleMs', () => {
  it('새로고침이 한 주기보다 빨리 끝나도 한 주기를 채운다', () => {
    expect(remainingRefreshCycleMs(100, 950)).toBe(850);
    expect(remainingRefreshCycleMs(0, 950)).toBe(950);
  });

  it('주기 중간에 끝나면 다음 주기 경계까지 기다린다', () => {
    expect(remainingRefreshCycleMs(1200, 950)).toBe(700);
  });

  it('주기 경계에서 끝나면 더 기다리지 않는다', () => {
    expect(remainingRefreshCycleMs(1900, 950)).toBe(0);
  });
});
