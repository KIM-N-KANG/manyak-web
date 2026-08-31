'use client';

import {
  BubbleChatIcon,
  Calendar04Icon,
  Image01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';
import Link from 'next/link';

import { AspectRatio } from '@/components/ui/aspect-ratio';
import { APP_PATH } from '@/constants/app-path';
import { StoryGenreBadges } from '@/features/stories/_shared/components/story-genre-badges';
import { StoryOptionsMenu } from '@/features/stories/_shared/components/story-options-menu';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { formatDate } from '@/lib/format-date';
import { SCREEN, track, useImpression } from '@/observability/analytics';

type CreatedStoryCardProps = {
  story: StoryListItem;
  position?: number;
};

export function CreatedStoryCard({ story, position }: CreatedStoryCardProps) {
  const storyId = story.id;
  const title = story.title ?? '';
  const thumbnailUrl = story.thumbnailUrlSm ?? null;
  const introduction = story.oneLineIntro?.trim() ?? '';
  const impressionRef = useImpression({
    object: 'storyCard',
    itemId: storyId ?? '',
    screen: SCREEN.STORY_LIST,
    onImpress: () => {
      if (storyId != null) {
        track('client_storyList_storyCard_impressed', {
          story_id: storyId,
          position,
          section: 'created',
        });
      }
    },
  });

  return (
    <article ref={impressionRef} className="relative flex gap-4 px-4 py-2">
      {storyId != null ? (
        <Link
          href={APP_PATH.STORY_DETAIL(storyId)}
          aria-label={`${title} 상세 보기`}
          className="absolute inset-0 z-10"
          onClick={() =>
            track('client_storyList_storyCard_clicked', {
              story_id: storyId,
              position,
              section: 'created',
            })
          }
        />
      ) : null}
      <AspectRatio
        ratio={3 / 4}
        className="w-32 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="128px"
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
      </AspectRatio>
      <div className="flex min-h-[10.6667rem] min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <div className="flex items-start gap-2">
            <p className="line-clamp-2 min-w-0 flex-1 leading-6 font-semibold break-keep">
              {title}
            </p>
            {storyId != null ? (
              <div className="relative z-20 shrink-0">
                <StoryOptionsMenu storyId={storyId} />
              </div>
            ) : null}
          </div>
          {introduction ? (
            <p className="mt-1 line-clamp-2 text-sm leading-5 break-keep text-foreground-secondary">
              {story.oneLineIntro}
            </p>
          ) : null}
          {story.genres.length > 0 ? (
            <div className="mt-2">
              <StoryGenreBadges genres={story.genres} />
            </div>
          ) : null}
        </div>
        <div className="mt-1 flex items-center justify-end gap-2">
          <div className="flex items-center gap-1 text-sm text-foreground-secondary">
            <HugeiconsIcon
              icon={BubbleChatIcon}
              className="size-3.5"
              aria-hidden="true"
            />
            <p>
              <span className="sr-only">누적 턴 수 </span>
              {(story.turnCount ?? 0).toLocaleString()}
            </p>
          </div>
          {story.createdAt ? (
            <div className="flex items-center gap-1 text-sm text-foreground-secondary">
              <HugeiconsIcon
                icon={Calendar04Icon}
                className="size-3.5"
                aria-hidden="true"
              />
              <time dateTime={story.createdAt}>
                {formatDate(story.createdAt)}
              </time>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
