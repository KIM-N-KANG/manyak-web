export type ChatListItem = {
  id: string;
  storyId: string;
  storyTitle: string;
  /** 참조 스토리 썸네일의 축소 변형 URL. 소스가 없으면 null. */
  thumbnailUrlSm?: string | null;
  lastStoryPreview: string;
  turnCount: number;
  updatedAt: string;
};
