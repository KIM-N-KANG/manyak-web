import { describe, expect, it } from 'vitest';

import type {
  GenerateSimpleStorylinesRequest,
  SimpleStoryTagListItemResponse,
} from '@/api/generated/models';

import { getSelectedKeywordsByCategory } from './tag-categories';

const TAGS: SimpleStoryTagListItemResponse[] = [
  { id: 1, name: '타임루프', category: 'GENRE' },
  { id: 2, name: '먼치킨', category: 'GENRE' },
  { id: 3, name: '사랑에 서툰', category: 'PROTAGONIST' },
  { id: 4, name: '상냥해서 더 위험한', category: 'SUPPORTING_CHARACTER' },
];

describe('getSelectedKeywordsByCategory', () => {
  it('request가 null이면 빈 배열을 반환한다', () => {
    expect(getSelectedKeywordsByCategory(null, TAGS)).toEqual([]);
  });

  it('카테고리 순서(장르 → 주인공 → 주변 인물)대로 그룹을 만든다', () => {
    const request: GenerateSimpleStorylinesRequest = {
      selectedTagIds: [3, 1, 4],
    };

    const groups = getSelectedKeywordsByCategory(request, TAGS);

    expect(groups.map((group) => group.category)).toEqual([
      'GENRE',
      'PROTAGONIST',
      'SUPPORTING_CHARACTER',
    ]);
    expect(groups[0]).toEqual({
      category: 'GENRE',
      label: '장르',
      keywords: ['타임루프'],
    });
  });

  it('선택값이 없는 카테고리는 제외한다', () => {
    const request: GenerateSimpleStorylinesRequest = {
      selectedTagIds: [1, 2],
    };

    const groups = getSelectedKeywordsByCategory(request, TAGS);

    expect(groups).toHaveLength(1);
    expect(groups[0].keywords).toEqual(['타임루프', '먼치킨']);
  });

  it('직접 추가 키워드를 해당 카테고리에 사전 정의 키워드 뒤로 포함한다', () => {
    const request: GenerateSimpleStorylinesRequest = {
      selectedTagIds: [1],
      customTags: [{ name: '회귀물', category: 'GENRE' }],
    };

    const groups = getSelectedKeywordsByCategory(request, TAGS);

    expect(groups[0].keywords).toEqual(['타임루프', '회귀물']);
  });
});
