import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import type { StoryCardSection } from '@/observability/analytics';

import { StoryCard } from './story-card';

type StoryCardGridProps = {
  stories: StoryListItem[];
  section: StoryCardSection;
};

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
