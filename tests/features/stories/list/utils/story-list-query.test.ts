import { describe, expect, it } from 'vitest';

import {
  parseStoryListQuery,
  toStoryListSearch,
} from '@/features/stories/list/utils/story-list-query';

describe('parseStoryListQuery', () => {
  it('쿼리가 없으면 전체와 인기순이다', () => {
    expect(parseStoryListQuery(new URLSearchParams())).toEqual({
      filter: 'all',
      sort: 'popular',
    });
  });

  it('유효한 값을 그대로 읽는다', () => {
    expect(
      parseStoryListQuery(new URLSearchParams('filter=original&sort=chats')),
    ).toEqual({ filter: 'original', sort: 'chats' });
  });

  it('알 수 없는 값은 기본값으로 대체한다', () => {
    expect(
      parseStoryListQuery(new URLSearchParams('filter=mine&sort=hot')),
    ).toEqual({ filter: 'all', sort: 'popular' });
  });
});

describe('toStoryListSearch', () => {
  it('기본값은 생략한다', () => {
    expect(toStoryListSearch({ filter: 'all', sort: 'popular' })).toBe('');
    expect(toStoryListSearch({ filter: 'original', sort: 'popular' })).toBe(
      '?filter=original',
    );
    expect(toStoryListSearch({ filter: 'all', sort: 'likes' })).toBe(
      '?sort=likes',
    );
  });

  it('파싱과 왕복한다', () => {
    const query = { filter: 'original', sort: 'chats' } as const;

    expect(
      parseStoryListQuery(new URLSearchParams(toStoryListSearch(query))),
    ).toEqual(query);
  });
});
