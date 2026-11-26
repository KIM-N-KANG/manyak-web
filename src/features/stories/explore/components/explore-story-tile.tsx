'use client';

/**
 * @file 탐색 그리드 한 칸의 표지 타일과 칸 안 표지 교체 프로토콜.
 *
 * 칸(`ExploreStoryCell`)은 그리드 순번을 키로 자리를 유지하고, 안의 타일은 스토리 ID를 키로 `AnimatePresence`에
 * 둔다. 칸의 스토리가 바뀌면 새 타일이 이전 타일 위에 겹쳐 나타나고, 이전 타일은 퇴장 동작 없이 남아 있다가 새 타일이
 * 다 나타나 `ExploreCellContext`의 `shownStoryId`가 바뀐 뒤에 걷어 낸다. 그래서 교체 중에도 빈 칸이 보이지 않는다.
 */
import { createContext, use, useEffect, useState } from 'react';

import { m, usePresence, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';

import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { APP_PATH } from '@/constants/app-path';
import { StoryGenreBadges } from '@/features/stories/_shared/components/story-genre-badges';
import { ORIGINAL_TAG_SRC } from '@/features/stories/_shared/constants/story-card';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { cn } from '@/lib/utils';
import {
  SCREEN,
  type StoryCardSection,
  track,
  useImpression,
} from '@/observability/analytics';

import {
  TILE_EASE,
  TILE_ENTER_SECONDS,
  TILE_REDUCED_SECONDS,
  tileEnterDelay,
} from '../utils/tile-motion';

/**
 * 표지 아래 검은 글 영역으로 표지를 이어 주는 덮개. 직선 그라데이션은 끝에 띠가 보여서, 위로 갈수록 천천히
 * 옅어지는 감속 곡선의 불투명도를 여러 지점에 나눠 표지에 녹아들게 한다.
 */
const COVER_SCRIM_GRADIENT = `linear-gradient(to top, ${[
  [1, 0],
  [0.738, 19],
  [0.541, 34],
  [0.382, 47],
  [0.278, 56.5],
  [0.194, 65],
  [0.126, 73],
  [0.075, 80.2],
  [0.042, 86.1],
  [0.021, 91],
  [0.008, 95.2],
  [0.002, 98.2],
  [0, 100],
]
  .map(([alpha, stop]) => `rgb(0 0 0 / ${alpha}) ${stop}%`)
  .join(', ')})`;

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
  /** 카드 이벤트의 목록 구분. 탐색 그리드는 `explore`, 검색 결과는 `search`다. */
  section: StoryCardSection;
};

/**
 * 탐색 그리드와 검색 결과의 표지 타일.
 *
 * @remarks
 * 표지 이미지를 받거나 받지 못할 때까지 등장을 미루고, 칸 순번에 따른 물결 지연 뒤 나타난다. 등장이 끝나면 칸에
 * 알려 이전 타일을 걷어 내게 하고, 사라지는 중인 타일은 아래 층에 두고 누름을 받지 않는다. 노출과 클릭 분석 이벤트를
 * 보낸다.
 *
 * @see ExploreCellContext
 * @see tileEnterDelay
 */
export function ExploreStoryTile({
  story,
  position,
  section,
}: ExploreStoryTileProps) {
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
          section,
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
      className={cn(
        'relative col-start-1 row-start-1 flex flex-col bg-black',
        !isPresent && 'pointer-events-none',
      )}
      style={{ zIndex: isPresent ? 1 : 0 }}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={isCoverReady ? { opacity: 1, scale: 1 } : undefined}
      transition={{
        delay,
        duration: reduceMotion ? TILE_REDUCED_SECONDS : TILE_ENTER_SECONDS,
        ease: TILE_EASE,
      }}
      onAnimationComplete={() => onShown(storyId)}>
      <div className="relative aspect-3/4">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 448px) 50vw, 224px"
            priority={position < 6}
            className="object-cover"
            onLoad={markCoverReady}
            onError={markCoverReady}
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center bg-muted">
            <ManyakSymbolIcon className="size-8 text-foreground-tertiary" />
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-px h-1/2"
          style={{ backgroundImage: COVER_SCRIM_GRADIENT }}
        />
      </div>
      <div
        aria-hidden="true"
        className="relative -mt-6 flex flex-col px-3 pb-3 text-white">
        <p className="line-clamp-1 text-sm leading-5 font-semibold">
          {story.title}
        </p>
        <p className="mt-0.5 line-clamp-2 min-h-8 text-xs leading-4 text-white/80">
          {story.oneLineIntro}
        </p>
        <div className="mt-1.5 h-4.5">
          {story.genres.length > 0 ? (
            <StoryGenreBadges genres={story.genres} size="xs" tone="inverse" />
          ) : null}
        </div>
      </div>
      {story.isOriginal && (
        <Image
          src={ORIGINAL_TAG_SRC}
          alt="오리지널"
          width={72}
          height={26}
          unoptimized
          className="absolute top-0 left-0 w-18 rounded-br-[6px] backdrop-blur-md"
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
              section,
            })
          }
        />
      )}
    </m.article>
  );
}
