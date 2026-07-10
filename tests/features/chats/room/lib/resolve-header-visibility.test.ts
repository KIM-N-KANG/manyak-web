import { describe, expect, it } from 'vitest';

import { resolveHeaderVisibility } from '@/features/chats/room/lib/resolve-header-visibility';

describe('resolveHeaderVisibility', () => {
  it('최상단 근처(8px 이내)에서는 항상 표시한다', () => {
    expect(resolveHeaderVisibility(0, 100, true)).toBe(true);
    expect(resolveHeaderVisibility(8, 100, true)).toBe(true);
  });

  it('프로그래매틱 스크롤이어도 최상단 근처면 표시한다', () => {
    expect(resolveHeaderVisibility(0, -100, false)).toBe(true);
  });

  it('아래로 충분히 스크롤하면 숨긴다', () => {
    expect(resolveHeaderVisibility(200, 5, true)).toBe(false);
  });

  it('위로 충분히 스크롤하면 표시한다', () => {
    expect(resolveHeaderVisibility(200, -5, true)).toBe(true);
  });

  it('사용자 스크롤이 아니면 방향과 무관하게 현 상태를 유지한다(null)', () => {
    expect(resolveHeaderVisibility(200, 100, false)).toBeNull();
    expect(resolveHeaderVisibility(200, -100, false)).toBeNull();
  });

  it('이동량이 임계값 이하이면 현 상태를 유지한다(null)', () => {
    expect(resolveHeaderVisibility(200, 4, true)).toBeNull();
    expect(resolveHeaderVisibility(200, -4, true)).toBeNull();
    expect(resolveHeaderVisibility(200, 0, true)).toBeNull();
  });
});
