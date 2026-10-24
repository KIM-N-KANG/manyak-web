import { describe, expect, it } from 'vitest';

import { NOTICE_READ_IDS_LIMIT } from '@/features/notices/_shared/constants';
import {
  appendNoticeReadId,
  hasUnreadNotice,
  isNoticeUnread,
  parseNoticeReadIds,
} from '@/features/notices/_shared/utils/notice-read-storage';

const NOW = Date.parse('2026-10-24T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const recent = { noticeId: 'a', publishedAt: '2026-10-24T03:00:00Z' };

describe('isNoticeUnread', () => {
  it('게시 30일 안이고 읽은 기록이 없으면 안 읽음이다', () => {
    expect(isNoticeUnread(recent, [], NOW)).toBe(true);
    expect(
      isNoticeUnread(
        { noticeId: 'b', publishedAt: new Date(NOW - 30 * DAY).toISOString() },
        [],
        NOW,
      ),
    ).toBe(true);
  });

  it('읽은 기록에 있으면 읽음이다', () => {
    expect(isNoticeUnread(recent, ['x', 'a'], NOW)).toBe(false);
  });

  it('게시된 지 30일이 지나면 열지 않아도 읽음으로 본다', () => {
    expect(
      isNoticeUnread(
        {
          noticeId: 'old',
          publishedAt: new Date(NOW - 31 * DAY).toISOString(),
        },
        [],
        NOW,
      ),
    ).toBe(false);
  });

  it('ID나 게시 시각이 없거나 깨졌으면 안 읽음으로 보지 않는다', () => {
    expect(isNoticeUnread({ publishedAt: recent.publishedAt }, [], NOW)).toBe(
      false,
    );
    expect(isNoticeUnread({ noticeId: 'a' }, [], NOW)).toBe(false);
    expect(
      isNoticeUnread({ noticeId: 'a', publishedAt: 'not-a-date' }, [], NOW),
    ).toBe(false);
  });
});

describe('hasUnreadNotice', () => {
  it('하나라도 안 읽은 공지가 있으면 true다', () => {
    const read = { noticeId: 'r', publishedAt: '2026-10-20T00:00:00Z' };

    expect(hasUnreadNotice([read, recent], ['r'], NOW)).toBe(true);
    expect(hasUnreadNotice([read], ['r'], NOW)).toBe(false);
    expect(hasUnreadNotice([], [], NOW)).toBe(false);
  });
});

describe('parseNoticeReadIds', () => {
  it('문자열 배열만 받아들이고 나머지는 빈 목록으로 본다', () => {
    expect(parseNoticeReadIds('["a","b"]')).toEqual(['a', 'b']);
    expect(parseNoticeReadIds(null)).toEqual([]);
    expect(parseNoticeReadIds('broken')).toEqual([]);
    expect(parseNoticeReadIds('{"a":1}')).toEqual([]);
    expect(parseNoticeReadIds('["a",1]')).toEqual([]);
  });
});

describe('appendNoticeReadId', () => {
  it('새 ID를 맨 앞에 두고 중복은 앞으로 옮긴다', () => {
    expect(appendNoticeReadId(['a', 'b'], 'c')).toEqual(['c', 'a', 'b']);
    expect(appendNoticeReadId(['a', 'b'], 'b')).toEqual(['b', 'a']);
  });

  it('상한을 넘기면 오래된 것부터 버린다', () => {
    const full = Array.from(
      { length: NOTICE_READ_IDS_LIMIT },
      (_, i) => `${i}`,
    );
    const next = appendNoticeReadId(full, 'new');

    expect(next).toHaveLength(NOTICE_READ_IDS_LIMIT);
    expect(next[0]).toBe('new');
    expect(next).not.toContain(`${NOTICE_READ_IDS_LIMIT - 1}`);
  });
});
