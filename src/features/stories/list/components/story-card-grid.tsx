import type { StoryCardSection } from '@/observability/analytics';

import type { StoryListItem } from '../types';
import { StoryCard } from './story-card';

type StoryCardGridProps = {
  stories: StoryListItem[];
  section: StoryCardSection;
};

/** 스토리 카드 2열 그리드. 오리지널과 내가 만든 스토리가 같은 카드 체계를 공유한다. */
export function StoryCardGrid({ stories, section }: StoryCardGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-x-2 gap-y-4">
      {stories.map((story, index) => (
        <li key={story.id}>
          <StoryCard story={story} position={index} section={section} />
        </li>
      ))}
    </ul>
  );
}
