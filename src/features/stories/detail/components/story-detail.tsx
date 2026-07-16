'use client';

import { useEffect, useRef, useState } from 'react';

import { Image01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AnimatePresence, m } from 'motion/react';
import Image from 'next/image';

import {
  getStoryDetail,
  useGetStoryDetail,
} from '@/api/generated/endpoints/stories/stories';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { StoryTurnCount } from '@/features/stories/_shared/components/story-turn-count';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useInView } from '@/hooks/use-in-view';
import { FADE_TRANSITION_PROPS } from '@/lib/motion';
import { queryFnWithoutAbortSignal } from '@/lib/query-client';
import { track } from '@/observability/analytics';

import { StoryDetailCta } from './story-detail-cta';
import { StoryDetailHeader } from './story-detail-header';
import { StoryDetailSkeleton } from './story-detail-skeleton';
import { StoryInfoSection } from './story-info-section';
import { startSettingValue } from './story-start-settings';
import { StoryThumbnailViewer } from './story-thumbnail-viewer';

type StoryDetailProps = {
  storyId: string;
};

export function StoryDetail({ storyId }: StoryDetailProps) {
  useEffect(() => {
    track('client_storyDetail_viewed', { story_id: storyId });
  }, [storyId]);

  const { data, isPending, isError, refetch } = useGetStoryDetail(storyId, {
    query: {
      queryFn: queryFnWithoutAbortSignal(() => getStoryDetail(storyId)),
    },
  });

  const showSkeleton = useDelayedLoading(isPending);
  const story = data?.status === 200 ? data.data : undefined;
  const thumbnailUrl = story?.thumbnailUrl ?? undefined;

  const [selectedStartSetting, setSelectedStartSetting] = useState<
    string | null
  >(null);
  const startSettings = story?.startSettings ?? [];
  const activeStartSetting =
    selectedStartSetting ?? startSettingValue(startSettings[0], 0);
  const activeStartSettingId = startSettings.find(
    (setting, index) =>
      startSettingValue(setting, index) === activeStartSetting,
  )?.id;

  const [isThumbnailViewerOpen, setIsThumbnailViewerOpen] = useState(false);

  const handleThumbnailClick = () => {
    if (!thumbnailUrl) {
      return;
    }

    track('client_storyDetail_thumbnail_clicked', { story_id: storyId });
    setIsThumbnailViewerOpen(true);
  };

  const contentRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const isTitleInView = useInView({
    targetRef: titleRef,
    rootRef: contentRef,
    enabled: Boolean(story),
  });

  const showTitle = Boolean(story) && !isTitleInView;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <StoryDetailHeader
        storyId={storyId}
        title={story?.title ?? ''}
        showTitle={showTitle}
      />

      <AnimatePresence mode="wait" initial={false}>
        {showSkeleton && (
          <m.main
            key="skeleton"
            className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
            {...FADE_TRANSITION_PROPS}>
            <StoryDetailSkeleton />
          </m.main>
        )}

        {!showSkeleton && isError && (
          <m.main
            key="error"
            className="flex min-h-0 flex-1 items-center justify-center px-4"
            {...FADE_TRANSITION_PROPS}>
            <section className="flex flex-col items-center gap-8">
              <div className="flex flex-col gap-1 text-center">
                <h3 className="text-lg font-semibold">
                  스토리를 불러오지 못했어요
                </h3>
                <p>잠시 후 다시 시도해주세요</p>
              </div>
              <Button variant="outline" size="lg" onClick={() => refetch()}>
                다시 시도하기
              </Button>
            </section>
          </m.main>
        )}

        {!showSkeleton && story && (
          <m.div
            key="content"
            className="flex min-h-0 flex-1 flex-col"
            {...FADE_TRANSITION_PROPS}>
            <main
              ref={contentRef}
              className="flex min-h-0 flex-1 scroll-fade-b flex-col overflow-y-auto overscroll-contain pb-4">
              <div className="shrink-0 px-4">
                <button
                  type="button"
                  aria-label="썸네일 크게 보기"
                  className="block w-full"
                  onClick={handleThumbnailClick}>
                  <AspectRatio
                    ratio={3 / 4}
                    className="w-full overflow-hidden rounded-xl border border-border">
                    {thumbnailUrl ? (
                      <Image
                        src={thumbnailUrl}
                        alt="스토리 썸네일"
                        fill
                        sizes="100vw"
                        priority
                        className="object-cover"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="flex size-full items-center justify-center bg-muted">
                        <HugeiconsIcon
                          icon={Image01Icon}
                          className="size-12 text-foreground-tertiary"
                        />
                      </div>
                    )}
                    <div className="absolute right-4 bottom-4">
                      <StoryTurnCount turnCount={story.turnCount ?? 0} />
                    </div>
                  </AspectRatio>
                </button>
              </div>
              <div className="px-4 pt-4">
                <StoryInfoSection
                  story={story}
                  titleRef={titleRef}
                  startSettingValue={activeStartSetting}
                  onStartSettingValueChange={setSelectedStartSetting}
                />
              </div>
            </main>

            <StoryDetailCta
              storyId={storyId}
              startSettingId={activeStartSettingId}
            />

            {thumbnailUrl && (
              <StoryThumbnailViewer
                open={isThumbnailViewerOpen}
                onOpenChange={setIsThumbnailViewerOpen}
                imageUrl={thumbnailUrl}
              />
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
