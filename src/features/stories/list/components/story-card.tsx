'use client';

import { Image01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';
import Link from 'next/link';

import { APP_PATH } from '@/constants/app-path';
import { StoryTurnCount } from '@/features/stories/components/story-turn-count';
import { SCREEN, track, useImpression } from '@/observability/analytics';

import type { StoryListItem } from '../types';
import { StoryGenreBadges } from './story-genre-badges';

type StoryCardProps = {
  story: StoryListItem;
  position?: number;
};

export function StoryCard({ story, position }: StoryCardProps) {
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
        });
      }
    },
  });

  // TODO: 백엔드 목록 응답에 썸네일이 추가되면 연결한다.
  const thumbnailUrl: string | null = null;

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
            })
          }
        />
      )}
      {/* 백엔드 썸네일 호스트가 확정되면 next.config remotePatterns에
          등록하고 unoptimized를 제거한다. */}
      <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg border border-b border-border bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="50vw"
            priority={position != null && position < 4}
            unoptimized
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
        <div className="absolute right-3 bottom-3">
          <StoryTurnCount turnCount={story.turnCount ?? 0} size="sm" />
        </div>
      </div>
      <div className="flex h-24 min-w-0 flex-col gap-0.5">
        <p className="line-clamp-2 leading-6 font-semibold">{story.title}</p>
        <p className="line-clamp-1 text-sm text-foreground-secondary">
          {story.oneLineIntro}
        </p>
        {story.genres.length > 0 && (
          <div className="mt-1.5">
            <StoryGenreBadges genres={story.genres} />
          </div>
        )}
      </div>
    </article>
  );
}
