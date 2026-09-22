import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatDateTime,
  formatSameDayTimeOrDate,
} from '@/lib/format-date';

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

describe('formatDateTime', () => {
  it('UTC 시각을 KST 분 단위로 옮긴다', () => {
    expect(formatDateTime('2026-09-21T15:05:00.000Z')).toBe('2026-09-22 00:05');
    expect(formatDateTime('2026-09-22T04:30:00.000Z')).toBe('2026-09-22 13:30');
  });

  it('해석할 수 없는 값은 앞 10자를 그대로 돌려준다', () => {
    expect(formatDateTime('not-a-date-value')).toBe('not-a-date');
  });
});

describe('formatSameDayTimeOrDate', () => {
  it('당일은 경과 시간으로 표시한다', () => {
    const now = Date.now();

    expect(formatSameDayTimeOrDate(new Date(now - 10_000).toISOString())).toBe(
      '방금 전',
    );
    expect(
      formatSameDayTimeOrDate(new Date(now - 5 * 60_000).toISOString()),
    ).toBe('5분 전');
  });

  it('날이 바뀌면 KST 날짜로 표시한다', () => {
    expect(formatSameDayTimeOrDate('2026-06-01T00:00:00Z')).toBe('2026-06-01');
  });

  it('해석할 수 없는 값은 앞 10자를 그대로 돌려준다', () => {
    expect(formatSameDayTimeOrDate('not-a-date-value')).toBe('not-a-date');
  });
});
