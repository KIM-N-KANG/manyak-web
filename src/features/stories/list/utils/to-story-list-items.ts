import type { StorySummaryResponse } from '@/api/generated/models';

import type { StoryListItem } from '../types';

/**
 * 조회한 스토리들을 저장된 ID 순서대로 정렬해 목록 아이템으로 변환한다.
 * 응답에 없는 ID는 제외하고, 누락된 장르는 빈 배열로 보정한다.
 */
export const toStoryListItems = (
  storyIds: string[],
  stories: StorySummaryResponse[],
): StoryListItem[] => {
  const storyById = new Map(stories.map((story) => [story.id, story]));

  return storyIds
    .map((storyId) => storyById.get(storyId))
    .filter((story): story is StorySummaryResponse => story != null)
    .map((story) => ({ ...story, genres: story.genres ?? [] }));
};
