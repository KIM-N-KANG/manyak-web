'use client';

import { Image01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';
import Link from 'next/link';

import { AspectRatio } from '@/components/ui/aspect-ratio';
import { APP_PATH } from '@/constants/app-path';
import { StoryTurnCount } from '@/features/stories/_shared/components/story-turn-count';
import { cn } from '@/lib/utils';
import type { StoryCardSection } from '@/observability/analytics';
import { SCREEN, track, useImpression } from '@/observability/analytics';

import { ORIGINAL_TAG_SRC } from '../constants';
import type { StoryListItem } from '../types';
import { StoryGenreBadges } from './story-genre-badges';

type StoryCardProps = {
  story: StoryListItem;
  position?: number;
  /** 카드가 속한 섹션. 분석에서 오리지널과 내 서재의 성과를 분리한다. */
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
  // 오리지널은 제목·제작자를, 내 서재는 제목·한 줄 소개·장르를 보여준다(같은 카드 골격에 메타만 다르다).
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
            sizes="50vw"
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
            // 벡터라 최적화할 것이 없고, next/image의 SVG 최적화는 기본적으로 막혀 있다.
            unoptimized
            className="absolute top-0 left-0 w-18"
          />
        )}
        <div className="absolute right-3 bottom-3">
          <StoryTurnCount turnCount={story.turnCount ?? 0} size="sm" />
        </div>
      </AspectRatio>
      <div
        className={cn(
          'flex min-w-0 flex-col gap-0.5',
          // 카드 텍스트 영역은 고정 높이로 그리드 행을 맞춘다(줄 수가 다르므로 변형마다 다르다).
          isOriginal ? 'h-18' : 'h-24',
        )}>
        <p className="line-clamp-2 leading-6 font-semibold">{story.title}</p>
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
