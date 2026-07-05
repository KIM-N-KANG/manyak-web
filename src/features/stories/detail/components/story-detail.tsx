'use client';

import { useEffect, useRef } from 'react';

import { AnimatePresence, m } from 'motion/react';

import { useGetStoryDetail } from '@/api/generated/endpoints/stories/stories';
import { Button } from '@/components/ui/button';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useInView } from '@/hooks/use-in-view';
import { track } from '@/observability/analytics';

import { StoryDetailCta } from './story-detail-cta';
import { StoryDetailHeader } from './story-detail-header';
import { StoryDetailSkeleton } from './story-detail-skeleton';
import { StoryInfoSection } from './story-info-section';

type StoryDetailProps = {
  storyId: string;
};

const fadeProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export function StoryDetail({ storyId }: StoryDetailProps) {
  useEffect(() => {
    track('client_storyDetail_viewed', { story_id: storyId });
  }, [storyId]);

  const { data, isPending, isError, refetch } = useGetStoryDetail(storyId);

  const showSkeleton = useDelayedLoading(isPending);
  const story = data?.status === 200 ? data.data : undefined;

  const contentRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const isTitleInView = useInView({
    targetRef: titleRef,
    rootRef: contentRef,
    enabled: Boolean(story),
  });

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      <StoryDetailHeader
        storyId={storyId}
        title={story?.title ?? ''}
        showTitle={Boolean(story) && !isTitleInView}
      />

      <AnimatePresence mode="wait" initial={false}>
        {showSkeleton && (
          <m.main
            key="skeleton"
            className="flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto"
            {...fadeProps}>
            <StoryDetailSkeleton />
          </m.main>
        )}

        {!showSkeleton && isError && (
          <m.main
            key="error"
            className="flex min-h-0 flex-1 items-center justify-center px-4"
            {...fadeProps}>
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
          </m.main>
        )}

        {!showSkeleton && story && (
          <m.div
            key="content"
            className="flex min-h-0 flex-1 flex-col"
            {...fadeProps}>
            <main
              ref={contentRef}
              className="flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto p-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
              <StoryInfoSection story={story} titleRef={titleRef} />
            </main>

            <StoryDetailCta storyId={storyId} />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
