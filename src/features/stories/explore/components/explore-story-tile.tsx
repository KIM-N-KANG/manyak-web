'use client';

import { createContext, use, useEffect, useState } from 'react';

import { m, usePresence, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';

import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { APP_PATH } from '@/constants/app-path';
import { ORIGINAL_TAG_SRC } from '@/features/stories/_shared/constants/story-card';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { cn } from '@/lib/utils';
import { SCREEN, track, useImpression } from '@/observability/analytics';

import {
  TILE_EASE,
  TILE_ENTER_SECONDS,
  TILE_REDUCED_SECONDS,
  tileEnterDelay,
} from '../utils/tile-motion';

type ExploreCellState = {
  /** 칸에서 지금 다 나타나 있는 표지의 스토리 ID. 이전 표지는 이 값이 자기와 달라질 때 걷어 낸다. */
  shownStoryId: string | undefined;
  /** 새 표지가 다 나타나면 부른다. */
  onShown: (storyId: string | undefined) => void;
};

/**
 * 그리드 칸이 표지들에게 나눠 주는 상태. AnimatePresence는 사라지는 표지에 마지막 props를 고정하므로
 * 이전 표지가 새 표지의 등장을 알 수 있게 props 대신 context로 전달한다.
 */
export const ExploreCellContext = createContext<ExploreCellState>({
  shownStoryId: undefined,
  onShown: () => {},
});

type ExploreStoryTileProps = {
  story: StoryListItem;
  position: number;
};

export function ExploreStoryTile({ story, position }: ExploreStoryTileProps) {
  const { shownStoryId, onShown } = use(ExploreCellContext);
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
  const [isPresent, safeToRemove] = usePresence();
  const reduceMotion = useReducedMotion();
  const thumbnailUrl = story.thumbnailUrlSm ?? null;
  const [isCoverReady, setIsCoverReady] = useState(thumbnailUrl === null);
  const delay = reduceMotion ? 0 : tileEnterDelay(position);
  const markCoverReady = () => setIsCoverReady(true);

  useEffect(() => {
    if (!isPresent && shownStoryId !== storyId) safeToRemove();
  }, [isPresent, shownStoryId, storyId, safeToRemove]);

  return (
    <m.article
      ref={impressionRef}
      className={cn('absolute inset-0', !isPresent && 'pointer-events-none')}
      style={{ zIndex: isPresent ? 1 : 0 }}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={isCoverReady ? { opacity: 1, scale: 1 } : undefined}
      transition={{
        delay,
        duration: reduceMotion ? TILE_REDUCED_SECONDS : TILE_ENTER_SECONDS,
        ease: TILE_EASE,
      }}
      onAnimationComplete={() => onShown(storyId)}>
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          sizes="(max-width: 448px) 34vw, 150px"
          priority={position < 6}
          className="object-cover"
          onLoad={markCoverReady}
          onError={markCoverReady}
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
    </m.article>
  );
}
