import { describe, expect, it } from 'vitest';

import { tileEnterDelay } from '@/features/stories/explore/utils/tile-motion';

describe('tileEnterDelay', () => {
  it('왼쪽 위 칸에서 시작해 같은 대각선의 칸은 함께 바뀐다', () => {
    expect(tileEnterDelay(0)).toBe(0);
    expect(tileEnterDelay(1)).toBeCloseTo(tileEnterDelay(3));
    expect(tileEnterDelay(2)).toBeCloseTo(tileEnterDelay(4));
    expect(tileEnterDelay(5)).toBeGreaterThan(tileEnterDelay(4));
  });

  it('아래로 내려가도 상한을 넘지 않는다', () => {
    expect(tileEnterDelay(59)).toBe(tileEnterDelay(300));
    expect(tileEnterDelay(300)).toBeLessThanOrEqual(0.45);
  });
});
