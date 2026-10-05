import { describe, expect, it } from 'vitest';

import type { GenreCatalog } from '@/features/stories/_shared/utils/genre-catalog';
import {
  EMPTY_GENRE_SELECTION,
  type GeneralStoryGenreSelection,
  resolveGeneralGenres,
  toGenreSelection,
  toggleGenre,
} from '@/features/studio/general/utils/genre-selection';

const CATALOG: GenreCatalog = {
  genres: [
    { id: 1, name: '판타지' },
    { id: 2, name: '로맨스' },
    { id: 3, name: '현대판타지' },
    { id: 4, name: 'BL' },
  ],
  featuredGenres: [
    { id: 1, name: '판타지' },
    { id: 2, name: '로맨스' },
  ],
};

describe('toggleGenre', () => {
  it('고른 순서대로 끝에 붙이고, 해제하면 그 장르만 뺀다', () => {
    let selection = toggleGenre(
      EMPTY_GENRE_SELECTION,
      { kind: 'tag', id: 3 },
      true,
      8,
      CATALOG,
    );

    selection = toggleGenre(
      selection,
      { kind: 'tag', id: 1 },
      true,
      8,
      CATALOG,
    );
    expect(selection.selected).toEqual([
      { kind: 'tag', id: 3 },
      { kind: 'tag', id: 1 },
    ]);

    selection = toggleGenre(
      selection,
      { kind: 'tag', id: 3 },
      false,
      8,
      CATALOG,
    );
    expect(selection.selected).toEqual([{ kind: 'tag', id: 1 }]);
  });

  it('대표 밖 장르는 처음 고를 때 칩 끝에 붙고 해제해도 남는다', () => {
    let selection = toggleGenre(
      EMPTY_GENRE_SELECTION,
      { kind: 'tag', id: 4 },
      true,
      8,
      CATALOG,
    );

    selection = toggleGenre(
      selection,
      { kind: 'tag', id: 3 },
      true,
      8,
      CATALOG,
    );
    selection = toggleGenre(
      selection,
      { kind: 'tag', id: 2 },
      true,
      8,
      CATALOG,
    );
    selection = toggleGenre(
      selection,
      { kind: 'tag', id: 4 },
      false,
      8,
      CATALOG,
    );
    selection = toggleGenre(
      selection,
      { kind: 'tag', id: 4 },
      true,
      8,
      CATALOG,
    );

    expect(selection.addedTagIds).toEqual([4, 3]);
  });

  it('상한에 닿았거나 이미 고른 장르면 그대로 두고, 상한에서도 해제는 한다', () => {
    const full = toggleGenre(
      EMPTY_GENRE_SELECTION,
      { kind: 'tag', id: 1 },
      true,
      1,
      CATALOG,
    );

    expect(toggleGenre(full, { kind: 'tag', id: 2 }, true, 1, CATALOG)).toBe(
      full,
    );
    expect(toggleGenre(full, { kind: 'tag', id: 1 }, true, 8, CATALOG)).toBe(
      full,
    );
    expect(
      toggleGenre(full, { kind: 'tag', id: 1 }, false, 1, CATALOG).selected,
    ).toEqual([]);
  });
});

describe('resolveGeneralGenres', () => {
  const legacy: GeneralStoryGenreSelection = {
    selected: [
      { kind: 'custom', id: 'c1' },
      { kind: 'tag', id: 2 },
      { kind: 'custom', id: 'c2' },
    ],
    customTags: [
      { id: 'c1', name: '현대 판타지' },
      { id: 'c2', name: '유실물' },
    ],
  };

  it('직접 입력 장르는 정식 이름과 같으면 제공 장르로 바꾸고, 아니면 선택에서 빼고 이름은 남긴다', () => {
    const { selection, needsReselection } = resolveGeneralGenres(
      legacy,
      CATALOG,
    );

    expect(selection.selected).toEqual([
      { kind: 'tag', id: 3 },
      { kind: 'tag', id: 2 },
    ]);
    expect(selection.customTags).toEqual(legacy.customTags);
    expect(selection.addedTagIds).toEqual([3]);
    expect(needsReselection).toBe(true);
  });

  it('제공 장르만 골랐으면 다시 고르라고 하지 않고, 목록을 받기 전이면 그대로 둔다', () => {
    const tagsOnly = toggleGenre(
      EMPTY_GENRE_SELECTION,
      { kind: 'tag', id: 1 },
      true,
      8,
      CATALOG,
    );

    expect(resolveGeneralGenres(tagsOnly, CATALOG).needsReselection).toBe(
      false,
    );
    expect(resolveGeneralGenres(legacy, undefined)).toEqual({
      selection: legacy,
      needsReselection: false,
    });
  });
});

describe('toGenreSelection', () => {
  it('정식 이름과 공백·대소문자만 다른 이름은 제공 장르로, 나머지는 제공 목록 밖 장르로 둔다', () => {
    const selection = toGenreSelection(['bl', '유실물', '로맨스'], CATALOG);

    expect(selection.selected[0]).toEqual({ kind: 'tag', id: 4 });
    expect(selection.selected[1]).toMatchObject({ kind: 'custom' });
    expect(selection.selected[2]).toEqual({ kind: 'tag', id: 2 });
    expect(selection.customTags.map(({ name }) => name)).toEqual(['유실물']);
  });
});
