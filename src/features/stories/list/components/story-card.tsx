import { Calendar04Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { APP_PATH } from '@/constants/app-path';
import { StoryOptionsMenu } from '@/features/stories/components/story-options-menu';
import { formatDate } from '@/lib/format-date';

import type { StoryListItem } from '../types';
import { StoryGenreBadges } from './story-genre-badges';

type StoryCardProps = {
  story: StoryListItem;
};

export function StoryCard({ story }: StoryCardProps) {
  return (
    <article className="relative flex flex-col gap-2 px-4 py-2">
      {story.id != null && (
        <Link
          href={APP_PATH.STORY_DETAIL(story.id)}
          aria-label={`${story.title} 상세 보기`}
          className="absolute inset-0 rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      )}
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 leading-6 font-semibold">{story.title}</p>
          {story.id != null && (
            <StoryOptionsMenu
              storyId={story.id}
              size="icon-xs"
              triggerClassName="relative z-10"
            />
          )}
        </div>
        {story.genres.length > 0 && <StoryGenreBadges genres={story.genres} />}
      </div>
      <p className="line-clamp-1 leading-4">{story.oneLineIntro}</p>
      <div className="flex items-center justify-end gap-1 text-sm text-foreground-secondary">
        <HugeiconsIcon
          icon={Calendar04Icon}
          className="size-4"
          aria-hidden="true"
        />
        {story.createdAt && (
          <time className="leading-4">{formatDate(story.createdAt)}</time>
        )}
      </div>
    </article>
  );
}
