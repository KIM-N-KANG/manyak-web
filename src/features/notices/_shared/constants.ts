/** 공지사항 화면과 헤더 버튼의 사용자 문구 정본. E2E와 문서는 리터럴 대신 이 상수를 참조한다. */
export const NOTICE_COPY = {
  title: '공지사항',
  /** 헤더 공지 버튼의 접근 이름. 새 공지가 있으면 `unreadButtonLabel`을 쓴다. */
  buttonLabel: '공지사항',
  unreadButtonLabel: '새 공지사항 있음',
  /** 목록 줄의 새 공지 점에 붙는 보조 기술용 이름 */
  newBadge: '새 공지',
  empty: '아직 등록된 공지가 없어요',
  loadFailed: '공지사항을 불러오지 못했어요',
  notFound: '공지를 찾을 수 없어요',
  notFoundDescription: '내려갔거나 주소가 잘못된 공지예요',
  backToList: '공지사항 목록으로',
  loadingMore: '공지사항을 더 불러오는 중',
  retry: '다시 시도하기',
  publishedAt: '게시',
  updatedAt: '수정',
} as const;

/** 공지 태그의 표시 라벨. 서버 `tag` 값마다 짧은 명사 하나로 둔다. */
export const NOTICE_TAG_LABEL = {
  SERVICE: '서비스',
  UPDATE: '업데이트',
  MAINTENANCE: '점검',
  EVENT: '이벤트',
  PROMOTION: '혜택',
} as const;

/** 상세를 열어 읽은 공지 ID를 최신순 JSON 배열로 두는 localStorage 키다. */
export const NOTICE_READ_STORAGE_KEY = 'manyak:notice-read-ids';

/** 읽음 목록에 남기는 공지 ID 최대 개수다. 넘치면 오래된 것부터 버린다. */
export const NOTICE_READ_IDS_LIMIT = 100;

/** 게시된 지 이 일수 안인 공지만 안 읽음으로 센다. 오래된 공지는 열지 않아도 조용해진다. */
export const NOTICE_UNREAD_WINDOW_DAYS = 30;
