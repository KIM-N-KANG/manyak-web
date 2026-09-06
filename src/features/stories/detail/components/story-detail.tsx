'use client';

import { useEffect, useState } from 'react';

import { Image01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AnimatePresence, m } from 'motion/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import {
  getStoryDetail,
  useGetStoryDetail,
} from '@/api/generated/endpoints/stories/stories';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { APP_PATH } from '@/constants/app-path';
import { StoryLikeCount } from '@/features/stories/_shared/components/story-like-count';
import { StoryTurnCount } from '@/features/stories/_shared/components/story-turn-count';
import { useCreatedStoryIds } from '@/features/stories/_shared/hooks/use-created-story-ids';
import { useStoryFooterBackground } from '@/features/stories/detail/hooks/use-story-footer-background';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useInView } from '@/hooks/use-in-view';
import { FetchError } from '@/lib/custom-fetch';
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

  const { data, error, isPending, isError, refetch } = useGetStoryDetail(
    storyId,
    {
      query: {
        queryFn: queryFnWithoutAbortSignal(() => getStoryDetail(storyId)),
      },
    },
  );

  const showSkeleton = useDelayedLoading(isPending, { delay: 300 });
  const story = data?.status === 200 ? data.data : undefined;
  const isNotFound = error instanceof FetchError && error.status === 404;

  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const createdStoryIds = useCreatedStoryIds();
  const isMember = sessionStatus === 'authenticated';
  const canDelete =
    story !== undefined &&
    (isMember
      ? story.isOwner === true
      : (createdStoryIds?.includes(storyId) ?? false));

  useDocumentTitle(story?.title ?? '');

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

  const [contentElement, setContentElement] = useState<HTMLElement | null>(
    null,
  );
  const [heroElement, setHeroElement] = useState<HTMLDivElement | null>(null);
  const [titleElement, setTitleElement] = useState<HTMLHeadingElement | null>(
    null,
  );
  const [metadataElement, setMetadataElement] = useState<HTMLDivElement | null>(
    null,
  );
  const footerSurfaceRef = useStoryFooterBackground(
    contentElement,
    metadataElement,
  );

  const isTitleInView = useInView({
    target: titleElement,
    root: contentElement,
    enabled: Boolean(story),
    rootMargin: '-56px 0px 0px',
  });

  const showTitle = Boolean(story) && !isTitleInView;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <StoryDetailHeader
        storyId={storyId}
        title={story?.title ?? ''}
        canReport={isMember && story !== undefined}
        canDelete={canDelete}
        onDeleteSuccess={() => router.replace(APP_PATH.MAIN.STUDIO)}
        showTitle={showTitle}
        hasHeroImage={Boolean(thumbnailUrl)}
        scrollContainerElement={contentElement}
        heroElement={heroElement}
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
            className="flex min-h-0 flex-1 flex-col pt-14"
            {...FADE_TRANSITION_PROPS}>
            {isNotFound ? (
              <div className="flex flex-1 items-center justify-center px-4 text-center text-sm">
                스토리를 찾을 수 없어요
              </div>
            ) : (
              <RetryListStatus
                title="스토리를 불러오지 못했어요"
                onRetry={() => refetch()}
              />
            )}
          </m.main>
        )}

        {!showSkeleton && story && (
          <m.div
            key="content"
            ref={footerSurfaceRef}
            className="flex min-h-0 flex-1 flex-col bg-[var(--story-footer-background,var(--background))]"
            {...FADE_TRANSITION_PROPS}>
            <main
              ref={setContentElement}
              className="flex min-h-0 flex-1 scroll-fade-b flex-col overflow-y-auto overscroll-contain bg-inherit">
              <div ref={setHeroElement} className="shrink-0 bg-background">
                {thumbnailUrl ? (
                  <button
                    type="button"
                    aria-label="썸네일 크게 보기"
                    className="block w-full"
                    onClick={handleThumbnailClick}>
                    <AspectRatio
                      ratio={3 / 4}
                      className="w-full overflow-hidden border-b border-border bg-muted">
                      <Image
                        src={thumbnailUrl}
                        alt="스토리 썸네일"
                        fill
                        sizes="(max-width: 448px) 100vw, 448px"
                        priority
                        className="object-cover"
                      />
                      <div className="absolute right-2 bottom-2 flex items-center gap-1">
                        <StoryLikeCount likeCount={story.likeCount ?? 0} />
                        <StoryTurnCount turnCount={story.turnCount ?? 0} />
                      </div>
                    </AspectRatio>
                  </button>
                ) : (
                  <AspectRatio
                    ratio={3 / 4}
                    className="w-full overflow-hidden border-b border-border bg-muted">
                    <div
                      role="img"
                      aria-label="스토리 썸네일 없음"
                      className="flex size-full items-center justify-center">
                      <HugeiconsIcon
                        icon={Image01Icon}
                        className="size-8 text-foreground-tertiary"
                      />
                    </div>
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                      <StoryLikeCount likeCount={story.likeCount ?? 0} />
                      <StoryTurnCount turnCount={story.turnCount ?? 0} />
                    </div>
                  </AspectRatio>
                )}
              </div>
              <div className="bg-background px-4 pt-4">
                <StoryInfoSection
                  story={story}
                  titleRef={setTitleElement}
                  metadataRef={setMetadataElement}
                  startSettingValue={activeStartSetting}
                  onStartSettingValueChange={setSelectedStartSetting}
                />
              </div>
            </main>

            <StoryDetailCta
              storyId={storyId}
              startSettingId={activeStartSettingId}
              canLike={
                sessionStatus !== 'loading' &&
                (isMember || createdStoryIds !== null) &&
                !canDelete &&
                story.isOwner !== true
              }
              isLiked={story.isLiked === true}
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
