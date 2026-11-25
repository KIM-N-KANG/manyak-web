'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { APP_PATH } from '@/constants/app-path';
import { StoryGenreBadges } from '@/features/stories/_shared/components/story-genre-badges';
import { StoryTurnCount } from '@/features/stories/_shared/components/story-turn-count';
import { ORIGINAL_TAG_SRC } from '@/features/stories/_shared/constants/story-card';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { cn } from '@/lib/utils';
import type { StoryCardSection } from '@/observability/analytics';
import { SCREEN, track, useImpression } from '@/observability/analytics';

type StoryCardProps = {
  story: StoryListItem;
  position?: number;
  /** 카드가 속한 섹션. 분석에서 홈 목록과 내가 만든 스토리의 성과를 분리한다. */
  section: StoryCardSection;
  /** 표지를 먼저 받을지. 생략하면 목록 앞 네 장만 먼저 받는다. */
  priority?: boolean;
  /**
   * 표지 이미지를 받을지. false면 표지 자리만 두고, 목록이 화면 근처에 왔을 때 true로 바꿔 받게 한다.
   * 먼저 받는 표지는 이 값과 관계없이 받고, 한 번 받은 표지는 false가 돼도 유지한다.
   */
  loadCover?: boolean;
};

export function StoryCard({
  story,
  position,
  section,
  priority = position != null && position < 4,
  loadCover = true,
}: StoryCardProps) {
  const storyId = story.id;
  const impressionRef = useImpression({
    object: 'storyCard',
    itemId: storyId ?? '',
    screen: SCREEN.STORY_LIST,
    onImpress: () => {
      if (storyId != null) {
        track('client_storyList_storyCard_impressed', {
          story_id: storyId,
          position,
          section,
        });
      }
    },
  });

  const thumbnailUrl = story.thumbnailUrlSm ?? null;
  const [isCoverLoaded, setIsCoverLoaded] = useState(false);
  const shouldShowCover = priority || loadCover || isCoverLoaded;

  return (
    <article ref={impressionRef} className="relative flex flex-col gap-2">
      <AspectRatio
        ratio={3 / 4}
        className="w-full overflow-hidden rounded-lg border border-border bg-muted">
        {thumbnailUrl ? (
          shouldShowCover && (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 448px) calc(50vw - 20px), 204px"
              priority={priority}
              // 늦게 받는 표지는 빈 칸에서 갑자기 나타나지 않게 받은 뒤 옅게 드러낸다.
              className={cn(
                'object-cover',
                !priority &&
                  'transition-opacity duration-200 motion-reduce:transition-none',
                !priority && !isCoverLoaded && 'opacity-0',
              )}
              onLoad={() => setIsCoverLoaded(true)}
            />
          )
        ) : (
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center">
            <ManyakSymbolIcon className="size-8 text-foreground-tertiary" />
          </div>
        )}
        {story.isOriginal && (
          <Image
            src={ORIGINAL_TAG_SRC}
            alt="오리지널"
            width={72}
            height={26}
            unoptimized
            className="absolute top-0 left-0 w-18 rounded-tl-[11px] rounded-br-[6px] backdrop-blur-md"
          />
        )}
        <div className="absolute right-2 bottom-2">
          <StoryTurnCount turnCount={story.turnCount ?? 0} size="sm" />
        </div>
      </AspectRatio>
      <div className="flex min-w-0 flex-col px-1">
        <p className="line-clamp-1 text-base leading-6 font-semibold">
          {storyId != null ? (
            <Link
              href={APP_PATH.STORY_DETAIL(storyId)}
              aria-label={`${story.title} 상세 보기`}
              className="after:absolute after:inset-0 after:z-10 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
              onClick={() =>
                track('client_storyList_storyCard_clicked', {
                  story_id: storyId,
                  position,
                  section,
                })
              }>
              {story.title}
            </Link>
          ) : (
            story.title
          )}
        </p>
        <p className="mt-0.5 line-clamp-2 min-h-10 text-sm leading-5 text-foreground-secondary">
          {story.oneLineIntro}
        </p>
        {story.genres.length > 0 ? (
          <div className="mt-2">
            <StoryGenreBadges genres={story.genres} size="sm" />
          </div>
        ) : null}
      </div>
    </article>
  );
}
