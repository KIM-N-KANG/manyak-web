import { describe, expect, it } from 'vitest';

import type { StorySummaryResponse } from '@/api/generated/models';
import {
  toOrderedStoryListItems,
  toStoryListItems,
} from '@/features/stories/_shared/utils/to-story-list-items';

const story = (id: string, genres?: string[]): StorySummaryResponse => ({
  id,
  title: `제목-${id}`,
  oneLineIntro: '한 줄 소개',
  genres,
  createdAt: '2026-06-01T00:00:00Z',
});

describe('toStoryListItems', () => {
  it('저장된 ID 순서를 유지하고 응답에 없는 ID는 제외한다', () => {
    const result = toStoryListItems(
      ['s2', 's3', 's1'],
      [story('s1', ['판타지']), story('s2')],
    );

    expect(result.map((item) => item.id)).toEqual(['s2', 's1']);
  });
});

describe('toOrderedStoryListItems', () => {
  it('서버 응답 순서를 그대로 유지한다', () => {
    const result = toOrderedStoryListItems([
      story('s1', ['판타지']),
      story('s2'),
    ]);

    expect(result.map((item) => item.id)).toEqual(['s1', 's2']);
  });

  it('누락된 장르를 빈 배열로 보정한다', () => {
    const result = toOrderedStoryListItems([story('s1')]);

    expect(result[0]?.genres).toEqual([]);
  });
});
