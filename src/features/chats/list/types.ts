export type ChatListItem = {
  id: string;
  storyId: string;
  /** 참조 스토리 제목. 스토리가 삭제되면 서버가 비워 보내므로 없을 수 있다. */
  storyTitle?: string;
  /** 참조 스토리 썸네일의 축소 변형 URL. 소스가 없으면 null. */
  thumbnailUrlSm?: string | null;
  /** 마지막으로 생성된 이야기 일부. 빈 문자열이면 카드가 안내 문구로 대체한다. */
  lastStoryPreview: string;
  /** 사용자가 이어쓴 횟수(완료된 턴 수). */
  turnCount: number;
  /** 마지막 진행 시각(ISO 8601 문자열). */
  updatedAt: string;
};
