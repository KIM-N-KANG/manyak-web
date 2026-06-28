import { describe, expect, it } from 'vitest';

import { resolveHeaderVisibility } from './resolve-header-visibility';

describe('resolveHeaderVisibility', () => {
  it('최상단 근처(8px 이내)에서는 항상 표시한다', () => {
    expect(resolveHeaderVisibility(0, 100)).toBe(true);
    expect(resolveHeaderVisibility(8, 100)).toBe(true);
  });

  it('아래로 충분히 스크롤하면 숨긴다', () => {
    expect(resolveHeaderVisibility(200, 5)).toBe(false);
  });

  it('위로 충분히 스크롤하면 표시한다', () => {
    expect(resolveHeaderVisibility(200, -5)).toBe(true);
  });

  it('이동량이 임계값 이하이면 현 상태를 유지한다(null)', () => {
    expect(resolveHeaderVisibility(200, 4)).toBeNull();
    expect(resolveHeaderVisibility(200, -4)).toBeNull();
    expect(resolveHeaderVisibility(200, 0)).toBeNull();
  });
});
