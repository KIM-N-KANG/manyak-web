import type { StorySummaryResponse } from '@/api/generated/models/storySummaryResponse';

/**
 * 목록 화면이 쓰는 스토리 요약. 응답에서 선택값인 `genres`를 `to-story-list-items.ts`의 변환에서 빈 배열로
 * 채워 항상 배열로 둔다.
 */
export type StoryListItem = Omit<StorySummaryResponse, 'genres'> & {
  genres: string[];
};
