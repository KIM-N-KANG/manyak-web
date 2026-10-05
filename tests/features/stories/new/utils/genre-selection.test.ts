import { describe, expect, it } from 'vitest';

import type { GenreCatalog } from '@/features/stories/_shared/utils/genre-catalog';
import {
  EMPTY_SIMPLE_GENRE_SELECTION,
  resolveSimpleGenreSelection,
  type SimpleGenreSelection,
  toggleSimpleGenre,
} from '@/features/stories/new/utils/genre-selection';

const CATALOG: GenreCatalog = {
  genres: [
    { id: 1, name: '판타지' },
    { id: 2, name: '로맨스' },
    { id: 3, name: '현대판타지' },
    { id: 4, name: 'BL' },
    { id: 5, name: '로맨스판타지' },
  ],
  featuredGenres: [
    { id: 1, name: '판타지' },
    { id: 2, name: '로맨스' },
  ],
};

/**
 * 빈 선택에서 장르를 차례로 고른다.
 *
 * @param ids 고를 장르 id
 * @returns 고른 뒤의 선택
 */
const select = (...ids: number[]) =>
  ids.reduce<SimpleGenreSelection>(
    (selection, id) => toggleSimpleGenre(selection, CATALOG, id, true),
    EMPTY_SIMPLE_GENRE_SELECTION,
  );

describe('toggleSimpleGenre', () => {
  it('대표 장르는 칩 목록에 더하지 않고, 대표 밖 장르는 처음 고른 순서대로 남긴다', () => {
    const selection = select(4, 2, 3);
    const toggledOff = toggleSimpleGenre(selection, CATALOG, 4, false);

    expect(selection.selectedIds).toEqual([4, 2, 3]);
    expect(toggledOff.selectedIds).toEqual([2, 3]);
    expect(toggledOff.addedIds).toEqual([4, 3]);
    expect(toggleSimpleGenre(toggledOff, CATALOG, 4, true).addedIds).toEqual([
      4, 3,
    ]);
  });

  it('3개를 고르면 새로 고르지 않지만 고른 장르는 해제한다', () => {
    const full = select(1, 2, 3);

    expect(toggleSimpleGenre(full, CATALOG, 4, true)).toBe(full);
    expect(toggleSimpleGenre(full, CATALOG, 2, false).selectedIds).toEqual([
      1, 3,
    ]);
  });

  it('제공 목록에 없는 장르나 이미 고른 장르는 그대로 둔다', () => {
    const selection = select(1);

    expect(toggleSimpleGenre(selection, CATALOG, 99, true)).toBe(selection);
    expect(toggleSimpleGenre(selection, CATALOG, 1, true)).toBe(selection);
  });

  it('장르를 바꾸면 이전 직접 입력 장르의 선택 표시를 지운다', () => {
    const selection = toggleSimpleGenre(
      {
        selectedIds: [],
        addedIds: [],
        legacyTags: [{ name: '유실물', selected: true }],
      },
      CATALOG,
      1,
      true,
    );

    expect(selection.legacyTags).toEqual([{ name: '유실물', selected: false }]);
  });
});

describe('resolveSimpleGenreSelection', () => {
  it('이전 직접 입력 장르는 정식 이름과 같으면 제공 장르로 바꾸고, 아니면 선택에서 빼고 남긴다', () => {
    const { selection, needsReselection } = resolveSimpleGenreSelection(
      {
        selectedIds: [1],
        addedIds: [],
        legacyTags: [
          { name: '현대 판타지', selected: true },
          { name: 'bl', selected: false },
          { name: '유실물', selected: true },
        ],
      },
      CATALOG,
    );

    expect(selection.selectedIds).toEqual([1, 3]);
    expect(selection.addedIds).toEqual([3, 4]);
    expect(selection.legacyTags).toEqual([{ name: '유실물', selected: true }]);
    expect(needsReselection).toBe(true);
  });

  it('추가 목록에 없는 대표 밖 선택 장르를 칩 앞에 두고, 제공 목록에 없는 id는 빼고 다시 고르게 한다', () => {
    const { selection, needsReselection } = resolveSimpleGenreSelection(
      { selectedIds: [5, 99], addedIds: [4, 1], legacyTags: [] },
      CATALOG,
    );

    expect(selection.selectedIds).toEqual([5]);
    expect(selection.addedIds).toEqual([5, 4]);
    expect(needsReselection).toBe(true);
  });

  it('제공 장르 목록을 받기 전이면 그대로 둔다', () => {
    const raw: SimpleGenreSelection = {
      selectedIds: [99],
      addedIds: [],
      legacyTags: [{ name: '유실물', selected: true }],
    };

    expect(resolveSimpleGenreSelection(raw, undefined)).toEqual({
      selection: raw,
      needsReselection: false,
    });
  });
});
