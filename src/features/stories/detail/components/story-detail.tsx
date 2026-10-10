'use client';

import { useEffect, useState } from 'react';

import { AnimatePresence, m } from 'motion/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import {
  getStoryDetail,
  useGetStoryDetail,
} from '@/api/generated/endpoints/stories/stories';
import { useList as usePersonas } from '@/api/generated/endpoints/user-persona-controller/user-persona-controller';
import type { StoryDetailResponse } from '@/api/generated/models';
import { FullscreenImageViewer } from '@/components/common/fullscreen-image-viewer';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { APP_PATH } from '@/constants/app-path';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { StoryLikeCount } from '@/features/stories/_shared/components/story-like-count';
import { StoryTurnCount } from '@/features/stories/_shared/components/story-turn-count';
import { useCreatedStoryIds } from '@/features/stories/_shared/hooks/use-created-story-ids';
import {
  clearCreatedPersona,
  useCreatedPersonaId,
} from '@/features/stories/_shared/utils/created-persona-selection';
import { PERSONA_SELECT_COPY } from '@/features/stories/detail/constants/start-setting-copy';
import { useStoryFooterBackground } from '@/features/stories/detail/hooks/use-story-footer-background';
import { buildChatStartSummary } from '@/features/stories/detail/utils/chat-start-summary';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useInView } from '@/hooks/use-in-view';
import { FetchError } from '@/lib/custom-fetch';
import { FADE_TRANSITION_PROPS } from '@/lib/motion';
import { queryFnWithoutAbortSignal } from '@/lib/query-client';
import { returnToMainTab } from '@/lib/return-to-main-tab';
import type { PublicStoryDetail } from '@/lib/stories/backend-story-client';
import { track } from '@/observability/analytics';

import { StoryDetailCta } from './story-detail-cta';
import { StoryDetailHeader } from './story-detail-header';
import { StoryDetailSkeleton } from './story-detail-skeleton';
import { StoryInfoSection } from './story-info-section';
import { startSettingValue } from './story-start-settings';

type StoryDetailProps = {
  storyId: string;
  initialStory?: PublicStoryDetail;
};

export function StoryDetail({ storyId, initialStory }: StoryDetailProps) {
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

  const fetchedStory = data?.status === 200 ? data.data : undefined;
  const story: StoryDetailResponse | undefined =
    fetchedStory ?? (isPending ? initialStory : undefined);
  const showSkeleton = useDelayedLoading(isPending && !story, { delay: 300 });
  const isNotFound = error instanceof FetchError && error.status === 404;

  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const createdStoryIds = useCreatedStoryIds();
  const isMember = sessionStatus === 'authenticated';
  const canDelete =
    fetchedStory !== undefined &&
    (isMember
      ? fetchedStory.isOwner === true
      : (createdStoryIds?.includes(storyId) ?? false));
  const canEdit = isMember && fetchedStory?.isOwner === true;

  useDocumentTitle(story?.title ?? '');

  const thumbnailUrl = story?.thumbnailUrl ?? undefined;

  const [selectedStartSetting, setSelectedStartSetting] = useState<
    string | null
  >(null);
  const startSettings = story?.startSettings ?? [];
  const activeStartSetting =
    selectedStartSetting ?? startSettingValue(startSettings[0], 0);
  const activeStartSettingIndex = startSettings.findIndex(
    (setting, index) =>
      startSettingValue(setting, index) === activeStartSetting,
  );
  const activeStartSettingId = startSettings[activeStartSettingIndex]?.id;

  const createdPersonaId = useCreatedPersonaId(storyId);
  const [pickedPersonaId, setPickedPersonaId] = useState<string | null>(null);
  const personaId = createdPersonaId ?? pickedPersonaId;
  const { isMember: canUsePersonas } = useMemberAccess();
  const { data: personasData } = usePersonas({
    query: { enabled: canUsePersonas },
  });
  const personaName =
    personasData?.status === 200
      ? personasData.data.find(({ id }) => id === personaId)?.name
      : undefined;
  const chatStartSummary = buildChatStartSummary(
    personaName ?? PERSONA_SELECT_COPY.defaultProtagonist,
    activeStartSettingIndex < 0
      ? undefined
      : (startSettings[activeStartSettingIndex].name ??
          `시작 상황 ${activeStartSettingIndex + 1}`),
  );

  const handlePersonaIdChange = (next: string | null) => {
    clearCreatedPersona();
    setPickedPersonaId(next);
  };

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
        canEdit={canEdit}
        canReport={isMember && fetchedStory !== undefined}
        canDelete={canDelete}
        onDeleteSuccess={() => returnToMainTab(router, APP_PATH.MAIN.STUDIO)}
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
                      <ManyakSymbolIcon
                        aria-hidden="true"
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
                  storyId={storyId}
                  story={story}
                  titleRef={setTitleElement}
                  metadataRef={setMetadataElement}
                  startSettingValue={activeStartSetting}
                  onStartSettingValueChange={setSelectedStartSetting}
                  personaId={personaId}
                  onPersonaIdChange={handlePersonaIdChange}
                />
              </div>
            </main>

            <StoryDetailCta
              storyId={storyId}
              isLoading={!fetchedStory}
              startSettingId={activeStartSettingId}
              personaId={personaId}
              summary={chatStartSummary}
              // 내가 만든 스토리로 판정된 때만 숨긴다. 판정 근거를 기다리며 숨겼다가 붙이면 하트가 뒤늦게
              // 튀어나와 CTA 폭이 바뀌므로, 미리 보여 주고 조회가 끝날 때까지 CTA처럼 잠근다.
              canLike={!canDelete && story.isOwner !== true}
              isLiked={story.isLiked === true}
            />

            {thumbnailUrl && (
              <FullscreenImageViewer
                open={isThumbnailViewerOpen}
                onOpenChange={setIsThumbnailViewerOpen}
                imageUrl={thumbnailUrl}
                alt="스토리 썸네일"
                title="스토리 썸네일 크게 보기"
              />
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
