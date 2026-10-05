import { describe, expect, it } from 'vitest';

import {
  findGenreByName,
  type GenreCatalog,
  getGenreChips,
  toGenreCatalog,
} from '@/features/stories/_shared/utils/genre-catalog';

const CATALOG: GenreCatalog = {
  genres: [
    { id: 1, name: '판타지' },
    { id: 2, name: '로맨스' },
    { id: 3, name: '현대판타지' },
    { id: 4, name: 'BL' },
  ],
  featuredGenres: [
    { id: 2, name: '로맨스' },
    { id: 1, name: '판타지' },
  ],
};

describe('toGenreCatalog', () => {
  it('id나 이름이 없는 항목을 뺀다', () => {
    expect(
      toGenreCatalog({
        genres: [{ id: 1, name: '판타지' }, { id: 2 }, { name: '이름만' }],
      }),
    ).toEqual({ genres: [{ id: 1, name: '판타지' }], featuredGenres: [] });
  });
});

describe('findGenreByName', () => {
  it('공백과 대소문자를 무시하고 정식 장르를 찾는다', () => {
    expect(findGenreByName(CATALOG, ' 현대 판타지 ')?.id).toBe(3);
    expect(findGenreByName(CATALOG, 'bl')?.id).toBe(4);
    expect(findGenreByName(CATALOG, '로판')).toBeUndefined();
  });
});

describe('getGenreChips', () => {
  it('대표 장르를 대표 순서대로 두고, 대표 밖 장르를 추가 순서대로 뒤에 붙인다', () => {
    expect(getGenreChips(CATALOG, [4, 3], [1, 3]).map(({ id }) => id)).toEqual([
      2, 1, 4, 3,
    ]);
  });

  it('추가 목록에 없는 대표 밖 선택 장르를 앞에 두고, 대표 장르와 없는 id는 칩을 더하지 않는다', () => {
    expect(getGenreChips(CATALOG, [1, 99, 4], [3]).map(({ id }) => id)).toEqual(
      [2, 1, 3, 4],
    );
  });
});
