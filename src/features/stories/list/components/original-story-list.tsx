'use client';

import { StoryCardGrid } from '@/features/stories/_shared/components/story-card-grid';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useTrackOnView } from '@/observability/analytics';

import { STORY_SECTION_TITLE } from '../constants';
import { useOriginalStories } from '../hooks/use-original-stories';
import { OriginalStoryListSkeleton } from './original-story-list-skeleton';
import { StorySection } from './story-section';

export function OriginalStoryList() {
  useTrackOnView('client_storyList_viewed');

  const { stories, isLoading } = useOriginalStories();
  const showSkeleton = useDelayedLoading(isLoading);

  if (showSkeleton) {
    return <OriginalStoryListSkeleton />;
  }

  if (isLoading || stories.length === 0) {
    return null;
  }

  return (
    <div className="pb-8">
      <StorySection title={STORY_SECTION_TITLE.ORIGINAL}>
        <StoryCardGrid stories={stories} section="original" />
      </StorySection>
    </div>
  );
}
