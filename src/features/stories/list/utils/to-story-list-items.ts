import type { StorySummaryResponse } from '@/api/generated/models';

import type { StoryListItem } from '../types';

/**
 * 조회한 스토리들을 저장된 ID 순서대로 정렬해 목록 아이템으로 변환한다.
 * 응답에 없는 ID는 제외하고, 누락된 장르는 빈 배열로 보정한다.
 *
 * @param storyIds 저장된 순서를 정의하는 스토리 ID 목록
 * @param stories 조회한 스토리 요약 응답 목록
 * @returns ID 순서대로 정렬된 스토리 목록 아이템
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

/**
 * 목록 응답을 서버 순서 그대로 목록 아이템으로 변환한다.
 * 서버가 의도한 순서(내 서재는 생성 최신순, 오리지널은 등록순)로 응답하므로
 * 재정렬하지 않고 누락 장르만 빈 배열로 보정한다.
 *
 * @param stories 목록 응답의 스토리 요약 목록
 * @returns 서버 순서를 유지한 스토리 목록 아이템
 */
export const toOrderedStoryListItems = (
  stories: StorySummaryResponse[],
): StoryListItem[] =>
  stories.map((story) => ({ ...story, genres: story.genres ?? [] }));
