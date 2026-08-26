'use client';

import { RetryListStatus } from '@/components/common/retry-list-status';
import { StoryCardGrid } from '@/features/stories/_shared/components/story-card-grid';
import { STORY_LIST_ERROR_TITLE } from '@/features/stories/_shared/constants/story-list';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useTrackOnView } from '@/observability/analytics';

import { STORY_SECTION_TITLE } from '../constants';
import { useOriginalStories } from '../hooks/use-original-stories';
import { OriginalStoryListSkeleton } from './original-story-list-skeleton';
import { StorySection } from './story-section';

export function OriginalStoryList() {
  useTrackOnView('client_storyList_viewed');

  const { stories, isLoading, isError, refetch } = useOriginalStories();
  const showSkeleton = useDelayedLoading(isLoading);

  if (showSkeleton) {
    return <OriginalStoryListSkeleton />;
  }

  if (isLoading) {
    return null;
  }

  if (isError) {
    return (
      <section className="flex flex-1 flex-col gap-3 px-4 pb-8">
        <h2 className="text-lg font-bold">{STORY_SECTION_TITLE.ORIGINAL}</h2>
        <RetryListStatus
          title={STORY_LIST_ERROR_TITLE}
          onRetry={() => refetch()}
        />
      </section>
    );
  }

  if (stories.length === 0) {
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
