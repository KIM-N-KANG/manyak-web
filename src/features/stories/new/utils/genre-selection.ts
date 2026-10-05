import type { KeywordCustomTagSnapshot } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  findGenreByName,
  type GenreCatalog,
  getAddedGenreIds,
} from '@/features/stories/_shared/utils/genre-catalog';

import { GENRE_MAX_SELECTION_COUNT } from '../constants';

/** 키워드 단계의 장르 선택이다. */
export type SimpleGenreSelection = {
  /** 고른 순서대로 놓인 제공 장르 id다. 생성 요청의 `genreTagIds`가 된다. */
  selectedIds: number[];
  /** 대표 밖에서 처음 고른 순서대로 놓인 장르 id다. 칩 순서를 정한다. */
  addedIds: number[];
  /** 직접 입력을 받던 때 저장한 장르다. 새 요청에는 싣지 않고 저장본에만 남긴다. */
  legacyTags: KeywordCustomTagSnapshot[];
};

export const EMPTY_SIMPLE_GENRE_SELECTION: SimpleGenreSelection = {
  selectedIds: [],
  addedIds: [],
  legacyTags: [],
};

/**
 * 제공 장르 목록에 맞춰 장르 선택을 정리한다. 이전 직접 입력 장르는 정식 이름과 같으면 제공 장르로 바꾸고,
 * 아니면 선택에서 빼고 남긴다. 목록에 없는 장르 id도 선택에서 뺀다. 목록을 받기 전이면 그대로 둔다.
 *
 * @param selection 정리할 장르 선택
 * @param catalog 제공 장르 목록
 * @returns 정리한 장르 선택과, 쓸 수 없는 장르를 골라 둬 다시 골라야 하는지 여부
 */
export function resolveSimpleGenreSelection(
  selection: SimpleGenreSelection,
  catalog: GenreCatalog | undefined,
): { selection: SimpleGenreSelection; needsReselection: boolean } {
  if (!catalog) return { selection, needsReselection: false };

  const validIds = new Set(catalog.genres.map(({ id }) => id));
  const matched = selection.legacyTags.map((tag) => ({
    tag,
    genre: findGenreByName(catalog, tag.name),
  }));
  const selectedIds = [
    ...new Set([
      ...selection.selectedIds.filter((id) => validIds.has(id)),
      ...matched.flatMap(({ tag, genre }) =>
        tag.selected && genre ? [genre.id] : [],
      ),
    ]),
  ].slice(0, GENRE_MAX_SELECTION_COUNT);
  const legacyTags = matched.flatMap(({ tag, genre }) => (genre ? [] : [tag]));

  return {
    selection: {
      selectedIds,
      addedIds: getAddedGenreIds(
        catalog,
        [
          ...selection.addedIds,
          ...matched.flatMap(({ genre }) => (genre ? [genre.id] : [])),
        ],
        selectedIds,
      ),
      legacyTags,
    },
    needsReselection:
      legacyTags.some(({ selected }) => selected) ||
      selection.selectedIds.some((id) => !validIds.has(id)),
  };
}

/**
 * 장르 하나를 고르거나 해제한 선택을 반환한다. 상한에 닿았으면 새로 고르지 않는다. 대표 밖 장르는 처음 고를 때
 * 칩 끝에 붙고 해제해도 남는다. 장르를 바꾸면 이전 직접 입력 장르의 선택 표시를 지워 재선택 안내를 내린다.
 *
 * @param selection 정리한 장르 선택
 * @param catalog 제공 장르 목록
 * @param id 누른 장르 id
 * @param pressed 고르면 참, 해제하면 거짓
 * @returns 바뀐 선택. 바뀌지 않으면 받은 선택 그대로
 */
export function toggleSimpleGenre(
  selection: SimpleGenreSelection,
  catalog: GenreCatalog,
  id: number,
  pressed: boolean,
): SimpleGenreSelection {
  const isSelected = selection.selectedIds.includes(id);
  const isBlocked =
    pressed === isSelected ||
    (pressed && selection.selectedIds.length >= GENRE_MAX_SELECTION_COUNT) ||
    !catalog.genres.some((genre) => genre.id === id);

  if (isBlocked) return selection;

  return {
    selectedIds: pressed
      ? [...selection.selectedIds, id]
      : selection.selectedIds.filter((selectedId) => selectedId !== id),
    addedIds: getAddedGenreIds(
      catalog,
      [...selection.addedIds, id],
      selection.selectedIds,
    ),
    legacyTags: selection.legacyTags.map((tag) => ({
      ...tag,
      selected: false,
    })),
  };
}
