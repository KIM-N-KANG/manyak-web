'use client';

import { useEffect, useRef } from 'react';

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
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useInView } from '@/hooks/use-in-view';
import { FADE_TRANSITION_PROPS } from '@/lib/motion';
import { queryFnWithoutAbortSignal } from '@/lib/query-client';
import { track } from '@/observability/analytics';

import { StoryDetailCta } from './story-detail-cta';
import { StoryDetailHeader } from './story-detail-header';
import { StoryDetailSkeleton } from './story-detail-skeleton';
import { StoryInfoSection } from './story-info-section';
import { StoryTurnCount } from './story-turn-count';

type StoryDetailProps = {
  storyId: string;
};

export function StoryDetail({ storyId }: StoryDetailProps) {
  useEffect(() => {
    track('client_storyDetail_viewed', { story_id: storyId });
  }, [storyId]);

  const { data, isPending, isError, refetch } = useGetStoryDetail(storyId, {
    query: {
      // StrictMode 이중 마운트로 상세가 두 번 조회되지 않도록 abort signal을
      // 전달하지 않는다. 배경은 queryFnWithoutAbortSignal 문서 참고.
      queryFn: queryFnWithoutAbortSignal(() => getStoryDetail(storyId)),
    },
  });

  const showSkeleton = useDelayedLoading(isPending);
  const story = data?.status === 200 ? data.data : undefined;
  const thumbnailUrl = story?.thumbnailUrl ?? undefined;

  const contentRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // 제목이 헤더(h-14=56px) 영역에 걸리기 시작하면(완전 가시가 깨지면) 곧바로
  // 헤더 타이틀을 띄운다. 아래쪽 경계는 100% 확장해 제목이 화면 하단 밖에
  // 있는 짧은 뷰포트에서 타이틀이 미리 뜨는 오작동을 막는다.
  const isTitleInView = useInView({
    targetRef: titleRef,
    rootRef: contentRef,
    enabled: Boolean(story),
    rootMargin: '-56px 0px 100% 0px',
    threshold: 0.99,
  });

  // 헤더(h-14=56px) 아래로 썸네일이 실제로 지나가는 동안만 헤더를 투명하게
  // 유지한다. 이미지 하단이 헤더 뒤로 완전히 사라지면 즉시 배경을 되살린다.
  const isHeroBehindHeader = useInView({
    targetRef: heroRef,
    rootRef: contentRef,
    enabled: Boolean(story),
    rootMargin: '-56px 0px 0px 0px',
  });

  const showTitle = Boolean(story) && !isTitleInView;

  return (
    <div className="relative flex h-svh min-h-0 flex-col overflow-hidden">
      <StoryDetailHeader
        storyId={storyId}
        title={story?.title ?? ''}
        showTitle={showTitle}
        overlay={Boolean(story) && isHeroBehindHeader}
      />

      <AnimatePresence mode="wait" initial={false}>
        {showSkeleton && (
          <m.main
            key="skeleton"
            className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-14"
            {...FADE_TRANSITION_PROPS}>
            <StoryDetailSkeleton />
          </m.main>
        )}

        {!showSkeleton && isError && (
          <m.main
            key="error"
            className="flex min-h-0 flex-1 items-center justify-center px-4 pt-14"
            {...FADE_TRANSITION_PROPS}>
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
            {...FADE_TRANSITION_PROPS}>
            <main
              ref={contentRef}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))]">
              {/* 백엔드 썸네일 호스트가 확정되면 next.config remotePatterns에
                  등록하고 unoptimized를 제거한다. */}
              <AspectRatio
                ref={heroRef}
                ratio={3 / 4}
                className="w-full shrink-0">
                {thumbnailUrl ? (
                  <Image
                    src={thumbnailUrl}
                    alt="스토리 썸네일"
                    fill
                    sizes="100vw"
                    priority
                    unoptimized
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
              <div className="px-4 pt-4">
                <StoryInfoSection story={story} titleRef={titleRef} />
              </div>
            </main>

            <StoryDetailCta storyId={storyId} />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
