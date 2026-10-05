/** 등록 탭 장르 선택의 입력 상태다. */

import {
  findGenreByName,
  type GenreCatalog,
  getAddedGenreIds,
} from '@/features/stories/_shared/utils/genre-catalog';

/**
 * 고른 장르 하나다. 제공 장르는 태그 id로, 제공 목록에 없는 장르(수정하는 스토리에 이미 저장된 장르나
 * 직접 입력을 받던 때의 장르)는 클라이언트 id로 가리킨다.
 */
export type GeneralStoryGenreKey =
  | { kind: 'tag'; id: number }
  | { kind: 'custom'; id: string };

export type GeneralStoryGenreSelection = {
  /** 고른 순서대로 놓인 장르다. 첫 번째 장르가 기본 커버를 정한다. */
  selected: GeneralStoryGenreKey[];
  customTags: { id: string; name: string }[];
  /** 대표 밖에서 처음 고른 순서대로 놓인 장르 id다. 칩 순서를 정한다. 제공 장르 검색 도입 전 저장본에는 없다. */
  addedTagIds?: number[];
};

export const EMPTY_GENRE_SELECTION: GeneralStoryGenreSelection = {
  selected: [],
  customTags: [],
};

/**
 * 고른 제공 장르의 id를 고른 순서대로 반환한다.
 *
 * @param selection 장르 선택
 * @returns 고른 제공 장르 id
 */
export const getSelectedGenreTagIds = (selection: GeneralStoryGenreSelection) =>
  selection.selected.flatMap((key) => (key.kind === 'tag' ? [key.id] : []));

/**
 * 장르 하나를 고르거나 해제한 선택을 반환한다. 고를 때는 상한을 넘지 않을 때만 끝에 붙인다.
 * 대표 밖 제공 장르는 처음 고를 때 칩 끝에 붙고 해제해도 남는다.
 *
 * @param selection 현재 선택
 * @param key 누른 장르
 * @param pressed 고르면 참, 해제하면 거짓
 * @param maxCount 고를 수 있는 최대 개수
 * @param catalog 제공 장르 목록
 * @returns 바뀐 선택
 */
export function toggleGenre(
  selection: GeneralStoryGenreSelection,
  key: GeneralStoryGenreKey,
  pressed: boolean,
  maxCount: number,
  catalog: GenreCatalog,
): GeneralStoryGenreSelection {
  const isSame = (item: GeneralStoryGenreKey) =>
    item.kind === key.kind && item.id === key.id;
  const isSelected = selection.selected.some(isSame);

  if (
    pressed === isSelected ||
    (pressed && selection.selected.length >= maxCount)
  ) {
    return selection;
  }

  return {
    ...selection,
    selected: pressed
      ? [...selection.selected, key]
      : selection.selected.filter((item) => !isSame(item)),
    ...(key.kind === 'tag' && {
      addedTagIds: getAddedGenreIds(
        catalog,
        [...(selection.addedTagIds ?? []), key.id],
        getSelectedGenreTagIds(selection),
      ),
    }),
  };
}

/**
 * 제공 장르 목록에 맞춰 새 등록(임시 저장본·반려된 제출본)의 장르 선택을 정리한다. 서버가 새 등록에는
 * 제공 장르만 받으므로, 제공 목록에 없는 장르는 정식 이름과 같으면 제공 장르로 바꾸고 아니면 선택에서 뺀다.
 * 뺀 장르의 이름은 지우지 않고 남긴다. 목록을 받기 전이면 그대로 둔다.
 *
 * @param selection 정리할 장르 선택
 * @param catalog 제공 장르 목록
 * @returns 정리한 장르 선택과, 쓸 수 없는 장르를 골라 둬 다시 골라야 하는지 여부
 */
export function resolveGeneralGenres(
  selection: GeneralStoryGenreSelection,
  catalog: GenreCatalog | undefined,
): { selection: GeneralStoryGenreSelection; needsReselection: boolean } {
  if (!catalog) return { selection, needsReselection: false };

  const validIds = new Set(catalog.genres.map(({ id }) => id));
  const ids = selection.selected.map((key) => {
    if (key.kind === 'tag') return validIds.has(key.id) ? key.id : null;

    const name = selection.customTags.find(({ id }) => id === key.id)?.name;

    return name === undefined
      ? null
      : (findGenreByName(catalog, name)?.id ?? null);
  });
  const selectedIds = [
    ...new Set(ids.filter((id): id is number => id !== null)),
  ];

  return {
    selection: {
      ...selection,
      selected: selectedIds.map((id) => ({ kind: 'tag', id })),
      addedTagIds: getAddedGenreIds(
        catalog,
        selection.addedTagIds ?? [],
        selectedIds,
      ),
    },
    needsReselection: ids.includes(null),
  };
}

/**
 * 장르 이름을 장르 선택으로 바꾼다. 제공 장르와 이름이 같으면(공백·대소문자 무시) 그 장르를, 아니면 제공 목록에
 * 없는 장르로 둔다.
 *
 * @param names 고른 순서대로 놓인 장르 이름
 * @param catalog 제공 장르 목록
 * @returns 장르 선택
 */
export function toGenreSelection(
  names: string[],
  catalog: GenreCatalog,
): GeneralStoryGenreSelection {
  const selection: GeneralStoryGenreSelection = {
    selected: [],
    customTags: [],
  };

  for (const name of names) {
    const genre = findGenreByName(catalog, name);

    if (genre) {
      selection.selected.push({ kind: 'tag', id: genre.id });
    } else {
      const id = crypto.randomUUID();

      selection.customTags.push({ id, name });
      selection.selected.push({ kind: 'custom', id });
    }
  }

  return selection;
}
