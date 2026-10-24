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

/** 마지막으로 공지 목록을 연 시점에 가장 최신이던 공지의 게시 시각(ISO)을 두는 localStorage 키다. */
export const NOTICE_SEEN_STORAGE_KEY = 'manyak:notice-last-seen-published-at';
