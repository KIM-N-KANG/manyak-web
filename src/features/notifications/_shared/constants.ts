/** 알림함 화면과 헤더 버튼의 사용자 문구 정본. E2E와 문서는 리터럴 대신 이 상수를 참조한다. */
export const NOTIFICATION_COPY = {
  title: '알림',
  /** 회원 헤더 종 버튼의 접근 이름. 안 읽은 알림이 있으면 `unreadButtonLabel`을 쓴다. */
  buttonLabel: '알림',
  unreadButtonLabel: '새 알림 있음',
  newsTab: '소식',
  activityTab: '활동',
  /** 탭 라벨 옆 점의 보조 기술용 이름 */
  unreadTab: '안 읽은 알림 있음',
  /** 카드 제목 옆 점의 보조 기술용 이름 */
  unreadCard: '안 읽음',
  readAll: '모두 읽음',
  /** 헤더 오른쪽 끝 톱니 아이콘 버튼의 접근 이름. 알림 설정 화면으로 간다. */
  settingsButtonLabel: '알림 설정',
  readAllFailed: '알림을 읽음 처리하지 못했어요',
  emptyNews: '아직 받은 소식이 없어요',
  emptyNewsDescription: '공지와 이벤트 소식이 여기에 모여요',
  emptyActivity: '아직 활동 알림이 없어요',
  emptyActivityDescription: '스토리가 완성되거나 검토가 끝나면 알려 드려요',
  loadFailed: '알림을 불러오지 못했어요',
  loadingMore: '알림을 더 불러오는 중',
  retry: '다시 시도하기',
} as const;

/** 알림 유형별 카드 위에 붙는 짧은 분류 라벨. 공지는 공지 태그 라벨로 대체한다. */
export const NOTIFICATION_TYPE_LABEL = {
  STORY_COMPLETED: '스토리 완성',
  STORY_MODERATION_COMPLETED: '검토 결과',
  NOTICE: '공지',
  ATTENDANCE_REMINDER: '출석 체크',
  PROMOTION: '이벤트',
} as const;
