'use client';

import { type UIEvent, useState } from 'react';

import { useGetStoryDetail } from '@/api/generated/endpoints/stories/stories';
import { Button } from '@/components/ui/button';
import { StoryInfoSection } from '@/features/stories/new/components/story-info-section';

import { StoryDetailCta } from './story-detail-cta';
import { StoryDetailHeader } from './story-detail-header';
import { StoryDetailSkeleton } from './story-detail-skeleton';

type StoryDetailProps = {
  storyId: number;
};

export function StoryDetail({ storyId }: StoryDetailProps) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const { data, isPending, isError, refetch } = useGetStoryDetail(storyId);

  const story = data?.status === 200 ? data.data : undefined;

  const handleContentScroll = (event: UIEvent<HTMLDivElement>) => {
    setHasScrolled(event.currentTarget.scrollTop > 0);
  };

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      <StoryDetailHeader storyId={storyId} hasScrolled={hasScrolled} />

      {isPending && (
        <main className="flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto">
          <StoryDetailSkeleton />
        </main>
      )}

      {isError && (
        <main className="flex min-h-0 flex-1 items-center justify-center px-4">
          <section className="flex flex-col items-center gap-8">
            <div className="flex flex-col gap-1 text-center">
              <h3 className="text-lg font-semibold">
                스토리를 불러오지 못했어요
              </h3>
              <p>잠시 후 다시 시도해주세요</p>
            </div>
            <Button variant="outline" size="lg" onClick={() => refetch()}>
              다시 시도
            </Button>
          </section>
        </main>
      )}

      {story && (
        <>
          <main
            className="flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto p-4 pb-20"
            onScroll={handleContentScroll}>
            <StoryInfoSection story={story} />
          </main>

          <StoryDetailCta />
        </>
      )}
    </div>
  );
}
