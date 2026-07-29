import { describe, expect, it } from 'vitest';

import { isTap } from '@/features/shares/utils/tap-gesture';

describe('isTap', () => {
  it('제자리에서 짧게 누르면 탭이다', () => {
    expect(isTap({ dx: 0, dy: 0, elapsedMs: 80 })).toBe(true);
  });

  it('임계값 안에서 살짝 흔들려도 탭이다', () => {
    expect(isTap({ dx: 6, dy: 8, elapsedMs: 200 })).toBe(true);
  });

  it('스크롤처럼 많이 움직이면 탭이 아니다', () => {
    expect(isTap({ dx: 0, dy: 40, elapsedMs: 120 })).toBe(false);
  });

  it('길게 누르면 탭이 아니다', () => {
    expect(isTap({ dx: 0, dy: 0, elapsedMs: 700 })).toBe(false);
  });

  it('음수 방향 이동도 거리로 본다', () => {
    expect(isTap({ dx: -30, dy: 0, elapsedMs: 100 })).toBe(false);
  });
});
