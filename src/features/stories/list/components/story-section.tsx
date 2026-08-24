import type { StoryCardSection } from '@/observability/analytics';

import type { StoryListItem } from '../types';
import { StoryCard } from './story-card';

type StorySectionProps = {
  title: string;
  stories: StoryListItem[];
  section: StoryCardSection;
};

/** 제목이 붙은 스토리 카드 그리드. 오리지널과 내 서재를 같은 카드 체계로 구분해 보여준다. */
export function StorySection({ title, stories, section }: StorySectionProps) {
  return (
    <section className="flex flex-col gap-3 p-4 pb-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8">
        {stories.map((story, index) => (
          <li key={story.id}>
            <StoryCard story={story} position={index} section={section} />
          </li>
        ))}
      </ul>
    </section>
  );
}
