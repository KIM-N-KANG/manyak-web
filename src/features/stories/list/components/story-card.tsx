import { Calendar04Icon, MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { StoryListItem } from '../types';
import { formatStoryDate } from '../utils/format-date';

type StoryCardProps = {
  story: StoryListItem;
};

export function StoryCard({ story }: StoryCardProps) {
  return (
    <article className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 font-semibold">{story.title}</p>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="스토리 옵션 더보기">
            <HugeiconsIcon icon={MoreVerticalIcon} aria-hidden="true" />
          </Button>
        </div>

        {story.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {story.genres.map((genre) => (
              <Badge
                key={genre}
                variant="secondary"
                className="text-foreground-secondary">
                {genre}
              </Badge>
            ))}
          </div>
        )}

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
