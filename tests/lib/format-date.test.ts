import { describe, expect, it } from 'vitest';

import { formatDate } from '@/lib/format-date';

describe('formatDate', () => {
  it('KST 자정을 넘긴 UTC 시각을 다음 날짜로 옮긴다', () => {
    expect(formatDate('2026-09-01T15:10:00Z')).toBe('2026-09-02');
  });

  it('KST 자정 직전 시각은 그날 날짜를 유지한다', () => {
    expect(formatDate('2026-09-01T14:59:59Z')).toBe('2026-09-01');
  });

  it('오프셋이 실린 시각도 같은 순간의 KST 날짜로 옮긴다', () => {
    expect(formatDate('2026-09-02T00:10:00+09:00')).toBe('2026-09-02');
  });

  it('해석할 수 없는 값은 앞 10자를 그대로 돌려준다', () => {
    expect(formatDate('unknown')).toBe('unknown');
  });
});
