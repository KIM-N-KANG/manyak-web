import type {
  GenreCatalogItem,
  GenreCatalogResponse,
} from '@/api/generated/models';

/** 제공 장르 하나다. id는 간편 제작 `genreTagIds`와 같은 태그 id다. */
export type Genre = { id: number; name: string };

/** 제공 장르 목록이다. `featuredGenres`는 칩으로 먼저 보이는 대표 장르다. */
export type GenreCatalog = { genres: Genre[]; featuredGenres: Genre[] };

/** 제공 장르 목록을 받지 못했을 때 쓰는 빈 목록이다. */
export const EMPTY_GENRE_CATALOG: GenreCatalog = {
  genres: [],
  featuredGenres: [],
};

/**
 * 응답의 장르 항목에서 id와 이름이 있는 것만 남긴다.
 *
 * @param items 응답의 장르 항목
 * @returns 장르 목록
 */
export const toGenres = (items: GenreCatalogItem[] | undefined): Genre[] =>
  (items ?? []).flatMap(({ id, name }) =>
    id != null && name ? [{ id, name }] : [],
  );

/**
 * 장르 조회 응답을 제공 장르 목록으로 바꾼다.
 *
 * @param response `GET /stories/genres` 응답
 * @returns 제공 장르 목록
 */
export const toGenreCatalog = (
  response: GenreCatalogResponse,
): GenreCatalog => ({
  genres: toGenres(response.genres),
  featuredGenres: toGenres(response.featuredGenres),
});

/**
 * 이름이 같은 제공 장르를 찾는다. 서버와 같이 공백을 모두 빼고 소문자로 바꿔 비교한다.
 *
 * @param catalog 제공 장르 목록
 * @param name 찾을 장르 이름
 * @returns 이름이 같은 제공 장르. 없으면 undefined
 */
export function findGenreByName(
  catalog: GenreCatalog,
  name: string,
): Genre | undefined {
  const toKey = (value: string) => value.replace(/\s/g, '').toLowerCase();
  const key = toKey(name);

  return catalog.genres.find((genre) => toKey(genre.name) === key);
}

/**
 * 대표 장르 뒤에 붙는 장르 칩의 id를 칩 순서대로 반환한다. 추가 목록에 없는 선택 장르(이전 저장본·제출본)는
 * 앞에 둬 칩이 사라지지 않게 하고, 제공 목록에 없거나 대표 장르인 id는 뺀다.
 *
 * @param catalog 제공 장르 목록
 * @param addedIds 대표 밖에서 처음 고른 순서대로 놓인 장르 id
 * @param selectedIds 고른 장르 id
 * @returns 대표 밖 장르 칩의 id
 */
export function getAddedGenreIds(
  catalog: GenreCatalog,
  addedIds: number[],
  selectedIds: number[],
): number[] {
  const featuredIds = new Set(catalog.featuredGenres.map(({ id }) => id));
  const validIds = new Set(catalog.genres.map(({ id }) => id));
  const ids = [
    ...selectedIds.filter((id) => !addedIds.includes(id)),
    ...addedIds,
  ];

  return [...new Set(ids)].filter(
    (id) => validIds.has(id) && !featuredIds.has(id),
  );
}

/**
 * 칩으로 보일 장르를 반환한다. 대표 장르는 늘 대표 순서를 지키고, 대표 밖 장르는 처음 고른 순서대로 뒤에 붙는다.
 *
 * @param catalog 제공 장르 목록
 * @param addedIds 대표 밖에서 처음 고른 순서대로 놓인 장르 id
 * @param selectedIds 고른 장르 id
 * @returns 칩 순서대로 놓인 장르
 */
export function getGenreChips(
  catalog: GenreCatalog,
  addedIds: number[],
  selectedIds: number[],
): Genre[] {
  return [
    ...catalog.featuredGenres,
    ...getAddedGenreIds(catalog, addedIds, selectedIds).flatMap(
      (id) => catalog.genres.find((genre) => genre.id === id) ?? [],
    ),
  ];
}
