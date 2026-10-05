/** 장르 검색 콤보박스와 장르 선택의 문구다. 앱 `create_genre_*` 문자열과 같다. */
export const GENRE_SEARCH_COPY = {
  placeholder: '장르 검색 및 선택',
  loading: '장르를 불러오고 있어요',
  empty: '검색 결과가 없어요',
  retry: '장르를 불러오지 못했어요. 다시 시도',
  openList: '장르 목록 열기',
  reselect:
    '이전 직접 입력 장르는 사용할 수 없어요. 제공 장르를 다시 선택해 주세요',
} as const;

/** 장르 검색어의 최대 글자 수다. 서버는 30자를 넘으면 400으로 거절한다. */
export const GENRE_QUERY_MAX_LENGTH = 30;

/** 입력을 멈춘 뒤 검색을 요청하기까지의 대기 시간(ms)이다. */
export const GENRE_SEARCH_DEBOUNCE_MS = 200;

/** 검색 요청이 이보다 오래 걸릴 때만 로딩 문구를 보인다(ms). 입력 대기 시간은 포함하지 않는다. */
export const GENRE_SEARCH_LOADING_DELAY_MS = 200;
