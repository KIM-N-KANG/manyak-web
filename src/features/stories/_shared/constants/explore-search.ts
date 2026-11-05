/** 검색어 최소 길이. 서버가 앞뒤 공백을 뺀 2~100자만 받는다. */
export const SEARCH_QUERY_MIN_LENGTH = 2;

/** 검색어 최대 길이. */
export const SEARCH_QUERY_MAX_LENGTH = 100;

/** 최근 검색어를 기기에 남기는 개수. */
export const RECENT_SEARCHES_LIMIT = 10;

/** 최근 검색어를 최신순 JSON 배열로 두는 localStorage 키다. */
export const RECENT_SEARCHES_STORAGE_KEY = 'manyak:recent-searches';

/** 탐색 검색바와 스토리 검색 화면의 사용자 문구 정본. E2E와 문서는 리터럴 대신 이 상수를 참조한다. */
export const EXPLORE_SEARCH_COPY = {
  /** 검색바와 검색 입력의 접근 이름 */
  label: '스토리 검색',
  placeholder: '제목, 인물, 장르로 검색',
  clear: '검색어 지우기',
  tooShort: '두 글자 이상 입력해 주세요',
  empty: '검색 결과가 없어요',
  loadFailed: '검색 결과를 불러오지 못했어요',
  recentTitle: '최근 검색어',
  clearRecent: '전체 삭제',
  removeRecent: (term: string) => `${term} 검색어 삭제`,
  genreTitle: '장르로 찾기',
} as const;
