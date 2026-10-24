import { describe, expect, it } from 'vitest';

import { isNoticeUnread } from '@/features/notices/_shared/utils/notice-seen-storage';

describe('isNoticeUnread', () => {
  it('한 번도 본 적이 없으면 게시된 공지는 새 공지다', () => {
    expect(isNoticeUnread('2026-10-24T03:00:00Z', null)).toBe(true);
  });

  it('마지막으로 본 시각보다 늦게 게시된 공지만 새 공지다', () => {
    const seen = '2026-10-24T03:00:00Z';

    expect(isNoticeUnread('2026-10-24T03:00:01Z', seen)).toBe(true);
    expect(isNoticeUnread('2026-10-24T03:00:00Z', seen)).toBe(false);
    expect(isNoticeUnread('2026-10-23T12:00:00Z', seen)).toBe(false);
  });

  it('게시 시각이 없거나 해석할 수 없으면 새 공지로 보지 않는다', () => {
    expect(isNoticeUnread(undefined, null)).toBe(false);
    expect(isNoticeUnread('not-a-date', '2026-10-24T03:00:00Z')).toBe(false);
  });

  it('기록된 시각이 깨져 있으면 새 공지로 본다', () => {
    expect(isNoticeUnread('2026-10-24T03:00:00Z', 'broken')).toBe(true);
  });
});
