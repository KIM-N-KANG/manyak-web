'use client';

import { Image01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';
import Link from 'next/link';

import { AspectRatio } from '@/components/ui/aspect-ratio';
import { APP_PATH } from '@/constants/app-path';
import { StoryOptionsMenu } from '@/features/stories/_shared/components/story-options-menu';
import { StoryTurnCount } from '@/features/stories/_shared/components/story-turn-count';
import { ORIGINAL_TAG_SRC } from '@/features/stories/_shared/constants/story-card';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import type { StoryCardSection } from '@/observability/analytics';
import { SCREEN, track, useImpression } from '@/observability/analytics';

import { StoryGenreBadges } from './story-genre-badges';

type StoryCardProps = {
  story: StoryListItem;
  position?: number;
  /** 카드가 속한 섹션. 분석에서 오리지널과 내가 만든 스토리의 성과를 분리한다. */
  section: StoryCardSection;
};

export function StoryCard({ story, position, section }: StoryCardProps) {
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
  const isOriginal = section === 'original';

  return (
    <article ref={impressionRef} className="relative flex flex-col gap-2">
      {storyId != null && (
        <Link
          href={APP_PATH.STORY_DETAIL(storyId)}
          aria-label={`${story.title} 상세 보기`}
          className="absolute inset-0 z-10"
          onClick={() =>
            track('client_storyList_storyCard_clicked', {
              story_id: storyId,
              position,
              section,
            })
          }
        />
      )}
      <AspectRatio
        ratio={3 / 4}
        className="w-full overflow-hidden rounded-lg border border-border bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 448px) calc(50vw - 20px), 204px"
            priority={position != null && position < 4}
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center">
            <HugeiconsIcon
              icon={Image01Icon}
              className="size-8 text-foreground-tertiary"
            />
          </div>
        )}
        {isOriginal && (
          <Image
            src={ORIGINAL_TAG_SRC}
            alt="오리지널"
            width={72}
            height={26}
            unoptimized
            className="absolute top-0 left-0 w-18 rounded-tl-[11px] rounded-br-[6px] backdrop-blur-md"
          />
        )}
        {!isOriginal && storyId != null ? (
          <div className="absolute top-2 right-2 z-20">
            <StoryOptionsMenu
              storyId={storyId}
              size="icon-sm"
              triggerClassName="rounded-full bg-black/20 text-white backdrop-blur-md hover:bg-black/20 hover:text-white aria-expanded:bg-black/20 aria-expanded:text-white"
            />
          </div>
        ) : null}
        <div className="absolute right-2 bottom-2">
          <StoryTurnCount turnCount={story.turnCount ?? 0} size="sm" />
        </div>
      </AspectRatio>
      {/* 모든 줄이 1줄 고정이라 카드 높이가 저절로 같아진다 — 텍스트 영역에 고정 높이를 두지 않는다. */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="line-clamp-1 leading-6 font-semibold">{story.title}</p>
        {isOriginal ? (
          story.author?.nickname != null && (
            <p className="line-clamp-1 text-sm text-foreground-secondary">
              {story.author.nickname}
            </p>
          )
        ) : (
          <>
            <p className="line-clamp-1 text-sm text-foreground-secondary">
              {story.oneLineIntro}
            </p>
            {story.genres.length > 0 && (
              <div className="mt-1.5">
                <StoryGenreBadges genres={story.genres} />
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}
