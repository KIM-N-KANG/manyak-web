import {
  DEFAULT_STORY_LIST_QUERY,
  STORY_LIST_FILTER_OPTIONS,
  STORY_LIST_SORT_OPTIONS,
  type StoryListFilter,
  type StoryListQuery,
  type StoryListSort,
} from '../constants';

type SearchParamsReader = { get: (name: string) => string | null };

/**
 * 쿼리 값이 선택지에 있으면 그 값을, 없으면 기본값을 고른다.
 *
 * @param options 허용하는 선택지
 * @param value URL 쿼리 값
 * @param fallback 기본값
 * @returns 선택지에 있는 값 또는 기본값
 */
const pickOption = <T extends string>(
  options: readonly { value: T }[],
  value: string | null,
  fallback: T,
): T => options.find((option) => option.value === value)?.value ?? fallback;

/**
 * URL 쿼리에서 홈 목록의 필터·정렬을 읽는다. 없거나 알 수 없는 값은 기본값으로 대체한다.
 *
 * @param searchParams URL 쿼리
 * @returns 조회에 쓸 필터·정렬
 */
export const parseStoryListQuery = (
  searchParams: SearchParamsReader,
): StoryListQuery => {
  return {
    filter: pickOption<StoryListFilter>(
      STORY_LIST_FILTER_OPTIONS,
      searchParams.get('filter'),
      DEFAULT_STORY_LIST_QUERY.filter,
    ),
    sort: pickOption<StoryListSort>(
      STORY_LIST_SORT_OPTIONS,
      searchParams.get('sort'),
      DEFAULT_STORY_LIST_QUERY.sort,
    ),
  };
};

/**
 * 필터·정렬을 URL 쿼리 문자열로 만든다. 기본값은 생략해 기본 상태의 홈 URL을 `/`로 유지한다.
 *
 * @param query 필터·정렬
 * @returns `?`로 시작하는 쿼리 문자열. 모두 기본값이면 빈 문자열
 */
export const toStoryListSearch = (query: StoryListQuery): string => {
  const params = new URLSearchParams();

  if (query.filter !== DEFAULT_STORY_LIST_QUERY.filter) {
    params.set('filter', query.filter);
  }

  if (query.sort !== DEFAULT_STORY_LIST_QUERY.sort) {
    params.set('sort', query.sort);
  }

  const search = params.toString();

  return search ? `?${search}` : '';
};
