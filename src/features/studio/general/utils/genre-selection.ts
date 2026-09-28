/** 등록 탭 장르 선택의 입력 상태다. */

/** 고른 장르 하나다. 제공 장르는 태그 id, 직접 추가한 장르는 클라이언트 id로 가리킨다. */
export type GeneralStoryGenreKey =
  | { kind: 'tag'; id: number }
  | { kind: 'custom'; id: string };

export type GeneralStoryGenreSelection = {
  /** 고른 순서대로 놓인 장르다. 첫 번째 장르가 기본 커버를 정한다. */
  selected: GeneralStoryGenreKey[];
  customTags: { id: string; name: string }[];
};

export const EMPTY_GENRE_SELECTION: GeneralStoryGenreSelection = {
  selected: [],
  customTags: [],
};

/**
 * 장르 하나를 고르거나 해제한 선택을 반환한다. 고를 때는 상한을 넘지 않을 때만 끝에 붙인다.
 *
 * @param selection 현재 선택
 * @param key 누른 장르
 * @param pressed 고르면 참, 해제하면 거짓
 * @param maxCount 고를 수 있는 최대 개수
 * @returns 바뀐 선택
 */
export function toggleGenre(
  selection: GeneralStoryGenreSelection,
  key: GeneralStoryGenreKey,
  pressed: boolean,
  maxCount: number,
): GeneralStoryGenreSelection {
  const isSame = (item: GeneralStoryGenreKey) =>
    item.kind === key.kind && item.id === key.id;
  const isSelected = selection.selected.some(isSame);

  if (!pressed) {
    return {
      ...selection,
      selected: selection.selected.filter((item) => !isSame(item)),
    };
  }

  if (isSelected || selection.selected.length >= maxCount) {
    return selection;
  }

  return { ...selection, selected: [...selection.selected, key] };
}
