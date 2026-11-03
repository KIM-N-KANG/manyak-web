'use client';

import Image from 'next/image';
import Link from 'next/link';

import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { APP_PATH } from '@/constants/app-path';
import { ORIGINAL_TAG_SRC } from '@/features/stories/_shared/constants/story-card';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { SCREEN, track, useImpression } from '@/observability/analytics';

type ExploreStoryTileProps = {
  story: StoryListItem;
  position: number;
};

export function ExploreStoryTile({ story, position }: ExploreStoryTileProps) {
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
          section: 'explore',
        });
      }
    },
  });

  const thumbnailUrl = story.thumbnailUrlSm ?? null;

  return (
    <article ref={impressionRef} className="relative">
      <AspectRatio ratio={3 / 4} className="w-full overflow-hidden bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 448px) 34vw, 150px"
            priority={position < 6}
            className="object-cover"
          />
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
            className="absolute top-0 left-0 w-14 rounded-br-[6px] backdrop-blur-md"
          />
        )}
      </AspectRatio>
      {storyId != null && (
        <Link
          href={APP_PATH.STORY_DETAIL(storyId)}
          aria-label={`${story.title} 상세 보기`}
          className="absolute inset-0 z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
          onClick={() =>
            track('client_storyList_storyCard_clicked', {
              story_id: storyId,
              position,
              section: 'explore',
            })
          }
        />
      )}
    </article>
  );
}
