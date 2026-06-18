import { Calendar04Icon, MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';

import type { StoryListItem } from '../types';
import { formatStoryDate } from '../utils/format-date';
import { StoryGenreBadges } from './story-genre-badges';

type StoryCardProps = {
  story: StoryListItem;
};

export function StoryCard({ story }: StoryCardProps) {
  return (
    <article className="relative flex flex-col gap-2">
      {story.id != null && (
        <Link
          href={APP_PATH.STORY_DETAIL(story.id)}
          aria-label={`${story.title} 상세 보기`}
          className="absolute inset-0 rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      )}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 font-semibold">{story.title}</p>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="스토리 옵션 더보기"
            className="relative z-10">
            <HugeiconsIcon icon={MoreVerticalIcon} aria-hidden="true" />
          </Button>
        </div>

        {story.genres.length > 0 && <StoryGenreBadges genres={story.genres} />}

        <p className="line-clamp-2 min-h-[2lh]">{story.summary}</p>
      </div>

      <div className="flex items-center justify-end gap-1 text-sm text-foreground-secondary">
        <HugeiconsIcon
          icon={Calendar04Icon}
          className="size-4"
          aria-hidden="true"
        />
        {story.createdAt && <time>{formatStoryDate(story.createdAt)}</time>}
      </div>
    </article>
  );
}
