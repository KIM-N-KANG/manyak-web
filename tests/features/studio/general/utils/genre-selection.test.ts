import { describe, expect, it } from 'vitest';

import {
  EMPTY_GENRE_SELECTION,
  toggleGenre,
} from '@/features/studio/general/utils/genre-selection';

describe('toggleGenre', () => {
  it('고른 순서대로 끝에 붙이고, 해제하면 그 장르만 뺀다', () => {
    let selection = toggleGenre(
      EMPTY_GENRE_SELECTION,
      { kind: 'custom', id: 'c1' },
      true,
      8,
    );

    selection = toggleGenre(selection, { kind: 'tag', id: 3 }, true, 8);
    expect(selection.selected).toEqual([
      { kind: 'custom', id: 'c1' },
      { kind: 'tag', id: 3 },
    ]);

    selection = toggleGenre(selection, { kind: 'custom', id: 'c1' }, false, 8);
    expect(selection.selected).toEqual([{ kind: 'tag', id: 3 }]);
  });

  it('상한에 닿았거나 이미 고른 장르면 그대로 둔다', () => {
    const full = toggleGenre(
      EMPTY_GENRE_SELECTION,
      { kind: 'tag', id: 1 },
      true,
      1,
    );

    expect(toggleGenre(full, { kind: 'tag', id: 2 }, true, 1)).toBe(full);
    expect(toggleGenre(full, { kind: 'tag', id: 1 }, true, 8)).toBe(full);
  });
});
