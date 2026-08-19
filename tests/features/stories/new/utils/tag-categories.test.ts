import { describe, expect, it } from 'vitest';

import type {
  GenerateSimpleStorylinesRequest,
  SimpleStoryTagListItemResponse,
} from '@/api/generated/models';
import { getSelectedKeywordGroups } from '@/features/stories/new/utils/tag-categories';

const REQUEST_ID = '11111111-1111-4111-8111-111111111111';

const TAGS: SimpleStoryTagListItemResponse[] = [
  { id: 1, name: '타임루프', category: 'GENRE' },
  { id: 2, name: '먼치킨', category: 'GENRE' },
  { id: 3, name: '사랑에 서툰', category: 'PROTAGONIST' },
  { id: 4, name: '상냥해서 더 위험한', category: 'SUPPORTING_CHARACTER' },
];

const EMPTY_CHARACTER = {
  name: null,
  gender: null,
  featureTagIds: [],
  customTags: [],
};

describe('getSelectedKeywordGroups', () => {
  it('request가 null이면 빈 배열을 반환한다', () => {
    expect(getSelectedKeywordGroups(null, TAGS)).toEqual([]);
  });

  it('장르 → 주인공 → 주변 인물 순서대로 그룹을 만든다', () => {
    const request: GenerateSimpleStorylinesRequest = {
      requestId: REQUEST_ID,
      genreTagIds: [1],
      protagonist: { ...EMPTY_CHARACTER, featureTagIds: [3] },
      supportingCharacters: [{ ...EMPTY_CHARACTER, featureTagIds: [4] }],
    };

    const groups = getSelectedKeywordGroups(request, TAGS);

    expect(groups.map((group) => group.id)).toEqual([
      'GENRE',
      'PROTAGONIST',
      'SUPPORTING_CHARACTER-0',
    ]);
    expect(groups[0]).toEqual({
      id: 'GENRE',
      label: '장르',
      tags: ['타임루프'],
    });
  });

  it('값이 없는 그룹은 제외한다', () => {
    const request: GenerateSimpleStorylinesRequest = {
      requestId: REQUEST_ID,
      genreTagIds: [1, 2],
      protagonist: EMPTY_CHARACTER,
      supportingCharacters: [EMPTY_CHARACTER],
    };

    const groups = getSelectedKeywordGroups(request, TAGS);

    expect(groups).toHaveLength(1);
    expect(groups[0].tags).toEqual(['타임루프', '먼치킨']);
  });

  it('인물 그룹은 이름 · 성별 · 특징 순으로 펼치고 직접 추가 특징을 뒤에 붙인다', () => {
    const request: GenerateSimpleStorylinesRequest = {
      requestId: REQUEST_ID,
      genreTagIds: [],
      protagonist: {
        name: '마냑',
        gender: 'FEMALE',
        featureTagIds: [3],
        customTags: ['회귀물'],
      },
      supportingCharacters: [],
    };

    const groups = getSelectedKeywordGroups(request, TAGS);

    expect(groups).toEqual([
      {
        id: 'PROTAGONIST',
        label: '주인공',
        tags: ['마냑', '여성', '사랑에 서툰', '회귀물'],
      },
    ]);
  });

  it('주변 인물이 여러 명이면 그룹 라벨에 순번을 붙인다', () => {
    const request: GenerateSimpleStorylinesRequest = {
      requestId: REQUEST_ID,
      genreTagIds: [],
      protagonist: EMPTY_CHARACTER,
      supportingCharacters: [
        { ...EMPTY_CHARACTER, name: '도라지' },
        { ...EMPTY_CHARACTER, name: '민들레' },
      ],
    };

    const groups = getSelectedKeywordGroups(request, TAGS);

    expect(groups.map((group) => group.label)).toEqual([
      '주변 인물 1',
      '주변 인물 2',
    ]);
  });
});
