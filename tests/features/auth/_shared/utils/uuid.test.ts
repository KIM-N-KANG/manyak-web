import { describe, expect, it } from 'vitest';

import { filterValidUuids, isUuid } from '@/features/auth/_shared/utils/uuid';

describe('isUuid', () => {
  it('표준 UUID 형식을 통과시킨다', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
  });

  it('형식이 깨진 값을 거른다', () => {
    expect(isUuid('')).toBe(false);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('123e4567e89b12d3a456426614174000')).toBe(false);
  });
});

describe('filterValidUuids', () => {
  it('유효한 UUID만 남긴다', () => {
    expect(
      filterValidUuids(['123e4567-e89b-12d3-a456-426614174000', 'broken', '']),
    ).toEqual(['123e4567-e89b-12d3-a456-426614174000']);
  });
});
