/** 홈 스토리 목록 필터 칩의 값과 정본 문구다. 값은 `GET /stories`의 `filter`와 같다. */
export const STORY_LIST_FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'original', label: '오리지널' },
] as const;

/** 홈 스토리 목록 정렬 드롭다운의 값과 정본 문구다. 값은 `GET /stories`의 `sort`와 같다. */
export const STORY_LIST_SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'likes', label: '인기순' },
  { value: 'chats', label: '채팅순' },
] as const;

export type StoryListFilter =
  (typeof STORY_LIST_FILTER_OPTIONS)[number]['value'];
export type StoryListSort = (typeof STORY_LIST_SORT_OPTIONS)[number]['value'];

export type StoryListQuery = {
  filter: StoryListFilter;
  sort: StoryListSort;
};

/** 홈 진입 기본 선택값이다. URL 쿼리가 없으면 이 값으로 조회한다. */
export const DEFAULT_STORY_LIST_QUERY: StoryListQuery = {
  filter: 'all',
  sort: 'latest',
};

export const STORY_LIST_COPY = {
  filterGroupLabel: '스토리 필터',
  sortTriggerLabel: '정렬 기준',
  loadingLabel: '스토리 불러오는 중',
  empty: '아직 스토리가 없어요',
} as const;
