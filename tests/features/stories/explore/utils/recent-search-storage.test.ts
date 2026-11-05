import { describe, expect, it } from 'vitest';

import { RECENT_SEARCHES_LIMIT } from '@/features/stories/_shared/constants/explore-search';
import {
  parseRecentSearches,
  prependRecentSearch,
} from '@/features/stories/explore/utils/recent-search-storage';

describe('prependRecentSearch', () => {
  it('새 검색어를 맨 앞에 넣는다', () => {
    expect(prependRecentSearch(['마법', '왕국'], '기사')).toEqual([
      '기사',
      '마법',
      '왕국',
    ]);
  });

  it('이미 있는 검색어는 맨 앞으로 옮기고 중복하지 않는다', () => {
    expect(prependRecentSearch(['마법', '왕국', '기사'], '기사')).toEqual([
      '기사',
      '마법',
      '왕국',
    ]);
  });

  it('상한을 넘기면 가장 오래된 검색어부터 뺀다', () => {
    const full = Array.from(
      { length: RECENT_SEARCHES_LIMIT },
      (_, index) => `검색어${index}`,
    );
    const next = prependRecentSearch(full, '새 검색어');

    expect(next).toHaveLength(RECENT_SEARCHES_LIMIT);
    expect(next[0]).toBe('새 검색어');
    expect(next).not.toContain(`검색어${RECENT_SEARCHES_LIMIT - 1}`);
  });
});

describe('parseRecentSearches', () => {
  it('문자열 배열만 검색어 목록으로 읽는다', () => {
    expect(parseRecentSearches('["마법","왕국"]')).toEqual(['마법', '왕국']);
  });

  it('없거나 깨졌거나 형식이 다르면 빈 목록이다', () => {
    expect(parseRecentSearches(null)).toEqual([]);
    expect(parseRecentSearches('{')).toEqual([]);
    expect(parseRecentSearches('{"a":1}')).toEqual([]);
    expect(parseRecentSearches('["마법",1]')).toEqual([]);
  });
});
