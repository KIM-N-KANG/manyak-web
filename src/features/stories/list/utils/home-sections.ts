import type { StoryHomeResponse } from '@/api/generated/models';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { toOrderedStoryListItems } from '@/features/stories/_shared/utils/to-story-list-items';

export type HomeSection = {
  /** 목록 키. 기본 섹션은 `id`가 null이라 이름으로 대신한다. */
  key: string;
  name: string;
  stories: StoryListItem[];
};

/**
 * 홈 목록 응답을 화면에 그릴 섹션으로 바꾼다.
 * 서버가 준 노출 순서를 유지하고 카드가 없는 섹션은 뺀다.
 *
 * @param response 홈 목록 응답
 * @returns 카드가 하나 이상 있는 섹션 목록
 */
export function toVisibleHomeSections(
  response: StoryHomeResponse | undefined,
): HomeSection[] {
  return (response?.sections ?? []).flatMap((section, index) => {
    const stories = toOrderedStoryListItems(section.items ?? []);
    const name = section.name ?? '';

    return stories.length > 0
      ? [{ key: section.id ?? `default-${index}-${name}`, name, stories }]
      : [];
  });
}
