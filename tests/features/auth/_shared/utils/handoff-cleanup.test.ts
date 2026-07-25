import { describe, expect, it } from 'vitest';

import { subtractMigratedIds } from '@/features/auth/_shared/utils/handoff-cleanup';

describe('subtractMigratedIds', () => {
  it('이관된 ID만 제거하고 나중에 만든 ID는 남긴다', () => {
    expect(subtractMigratedIds(['a', 'b', 'c'], ['a'])).toEqual(['b', 'c']);
  });

  it('이관 목록이 비면 원본을 그대로 둔다', () => {
    expect(subtractMigratedIds(['a', 'b'], [])).toEqual(['a', 'b']);
  });

  it('현재 목록에 없는 이관 ID는 무시한다', () => {
    expect(subtractMigratedIds(['a'], ['x'])).toEqual(['a']);
  });

  it('원본 순서를 보존한다', () => {
    expect(subtractMigratedIds(['c', 'a', 'b'], ['a'])).toEqual(['c', 'b']);
  });
});
