'use client';

import { useEffect } from 'react';

import { useGetStoryDetail } from '@/api/generated/endpoints/stories/stories';
import { Button } from '@/components/ui/button';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { track } from '@/lib/analytics';

import { StoryDetailCta } from './story-detail-cta';
import { StoryDetailHeader } from './story-detail-header';
import { StoryDetailSkeleton } from './story-detail-skeleton';
import { StoryInfoSection } from './story-info-section';

type StoryDetailProps = {
  storyId: string;
};

export function StoryDetail({ storyId }: StoryDetailProps) {
  useEffect(() => {
    track('client_storyDetail_viewed', { story_id: storyId });
  }, [storyId]);

  const { data, isPending, isError, refetch } = useGetStoryDetail(storyId);

  const showSkeleton = useDelayedLoading(isPending);
  const story = data?.status === 200 ? data.data : undefined;

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      <StoryDetailHeader storyId={storyId} />

      {showSkeleton && (
        <main className="flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto">
          <StoryDetailSkeleton />
        </main>
      )}

      {!showSkeleton && isError && (
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

      {!showSkeleton && story && (
        <>
          <main className="flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto p-4 pb-20">
            <StoryInfoSection story={story} />
          </main>

          <StoryDetailCta storyId={storyId} />
        </>
      )}
    </div>
  );
}
