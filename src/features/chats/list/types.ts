export type ChatListItem = {
  id: string;
  storyId: string;
  /** 참조 스토리 제목. 스토리가 삭제되면 서버가 비워 보내므로 없을 수 있다. */
  storyTitle?: string;
  /** 참조 스토리 썸네일의 축소 변형 URL. 소스가 없으면 null. */
  thumbnailUrlSm?: string | null;
  lastStoryPreview: string;
  turnCount: number;
  updatedAt: string;
};
