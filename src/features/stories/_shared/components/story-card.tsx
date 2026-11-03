'use client';

import { BubbleChatIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';
import Link from 'next/link';

import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { APP_PATH } from '@/constants/app-path';
import { ORIGINAL_TAG_SRC } from '@/features/stories/_shared/constants/story-card';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { formatCompactCount } from '@/lib/format-count';
import type { StoryCardSection } from '@/observability/analytics';
import { SCREEN, track, useImpression } from '@/observability/analytics';

type StoryCardProps = {
  story: StoryListItem;
  position?: number;
  /** 카드가 속한 섹션. 분석에서 홈 목록과 내가 만든 스토리의 성과를 분리한다. */
  section: StoryCardSection;
  /** 표지를 먼저 받을지. 생략하면 목록 앞 네 장만 먼저 받는다. */
  priority?: boolean;
};

export function StoryCard({
  story,
  position,
  section,
  priority = position != null && position < 4,
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

  return (
    <article ref={impressionRef} className="relative flex flex-col gap-2">
      <AspectRatio
        ratio={3 / 4}
        className="w-full overflow-hidden rounded-lg border border-border bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 448px) calc(50vw - 20px), 204px"
            priority={priority}
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
            className="absolute top-0 left-0 w-18 rounded-tl-[11px] rounded-br-[6px] backdrop-blur-md"
          />
        )}
      </AspectRatio>
      <div className="flex min-w-0 flex-col px-1">
        <p className="line-clamp-1 text-base leading-6 font-semibold [word-break:normal] [text-wrap-style:auto]">
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
        <p className="mt-0.5 line-clamp-2 min-h-10 text-sm leading-5 [word-break:normal] text-foreground-secondary [text-wrap-style:auto]">
          {story.oneLineIntro}
        </p>
        <p className="mt-1.5 flex items-center gap-1 text-[13px] leading-[18px] font-medium text-foreground-secondary">
          <HugeiconsIcon
            icon={BubbleChatIcon}
            className="size-4"
            aria-hidden="true"
          />
          <span>
            <span className="sr-only">누적 턴 수 </span>
            {formatCompactCount(story.turnCount ?? 0)}
          </span>
        </p>
      </div>
    </article>
  );
}
