import { describe, expect, it } from 'vitest';

import { formatCompactCount } from '@/lib/format-count';

describe('formatCompactCount', () => {
  it('1,000 미만은 그대로 둔다', () => {
    expect(formatCompactCount(0)).toBe('0');
    expect(formatCompactCount(999)).toBe('999');
  });

  it('천·백만 단위를 소수 첫째 자리까지 버림으로 축약한다', () => {
    expect(formatCompactCount(1000)).toBe('1K');
    expect(formatCompactCount(1280)).toBe('1.2K');
    expect(formatCompactCount(1999)).toBe('1.9K');
    expect(formatCompactCount(12345)).toBe('12.3K');
    expect(formatCompactCount(999999)).toBe('999.9K');
    expect(formatCompactCount(1250000)).toBe('1.2M');
  });
});
