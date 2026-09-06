'use client';

import { useState } from 'react';

import {
  Alert02Icon,
  BubbleChatIcon,
  Calendar04Icon,
  Delete02Icon,
  Image01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import {
  CardOptionsDialog,
  type CardOptionsDialogItem,
} from '@/components/common/card-options-dialog';
import { HeartOutlineIcon } from '@/components/icons/heart-outline-icon';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { APP_PATH } from '@/constants/app-path';
import { StoryGenreBadges } from '@/features/stories/_shared/components/story-genre-badges';
import { StoryReportSheet } from '@/features/stories/_shared/components/story-report-sheet';
import { STORY_LIKE_COPY } from '@/features/stories/_shared/constants/story-like';
import { STORY_REPORT_COPY } from '@/features/stories/_shared/constants/story-report';
import { useDeleteCreatedStory } from '@/features/stories/_shared/hooks/use-delete-created-story';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { SCREEN, track, useImpression } from '@/observability/analytics';

type CreatedStoryCardProps = {
  story: StoryListItem;
  position?: number;
};

export function CreatedStoryCard({ story, position }: CreatedStoryCardProps) {
  const storyId = story.id;
  const title = story.title ?? '';
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
    <article ref={impressionRef} className="relative flex px-4 py-2">
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
      <CreatedStoryCardBody
        story={story}
        position={position}
        action={
          storyId != null ? (
            <CreatedStoryCardOptions story={story} storyId={storyId} />
          ) : null
        }
      />
    </article>
  );
}

type CreatedStoryCardOptionsProps = {
  story: StoryListItem;
  storyId: string;
};

function CreatedStoryCardOptions({
  story,
  storyId,
}: CreatedStoryCardOptionsProps) {
  const { status } = useSession();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const { deleteStory, isPending } = useDeleteCreatedStory(storyId);
  const canReport = status === 'authenticated';

  const items: CardOptionsDialogItem[] = [];

  if (canReport) {
    items.push({
      icon: Alert02Icon,
      label: STORY_REPORT_COPY.action,
      onSelect: () => setIsReportOpen(true),
    });
  }

  items.push({
    icon: Delete02Icon,
    label: '삭제하기',
    variant: 'destructive',
    onSelect: deleteStory,
    confirm: { title: '스토리를 삭제할까요?', isPending },
  });

  return (
    <>
      <CardOptionsDialog
        title="스토리 옵션"
        triggerAriaLabel="스토리 옵션 더보기"
        items={items}
        preview={<CreatedStoryCardBody story={story} compact />}
      />
      {canReport && (
        <StoryReportSheet
          storyId={storyId}
          source="studio"
          open={isReportOpen}
          onOpenChange={setIsReportOpen}
        />
      )}
    </>
  );
}

/**
 * 카드 본체의 props. 목록 카드와 옵션 다이얼로그의 축소판이 같은 마크업을 쓰되, 축소판은
 * `compact`로 표지·서체·간격을 한 단계씩 줄이고 링크·노출 추적·옵션 버튼을 두지 않는다.
 */
type CreatedStoryCardBodyProps = {
  story: StoryListItem;
  position?: number;
  compact?: boolean;
  /** 제목 줄 오른쪽 끝에 놓는 요소(옵션 버튼) */
  action?: React.ReactNode;
};

function CreatedStoryCardBody({
  story,
  position,
  compact = false,
  action,
}: CreatedStoryCardBodyProps) {
  const title = story.title ?? '';
  const thumbnailUrl = story.thumbnailUrlSm ?? null;
  const introduction = story.oneLineIntro?.trim() ?? '';

  return (
    <div className={cn('flex min-w-0 flex-1', compact ? 'gap-3' : 'gap-4')}>
      <AspectRatio
        ratio={3 / 4}
        className={cn(
          'shrink-0 overflow-hidden rounded-lg border border-border bg-muted',
          compact ? 'w-20' : 'w-32',
        )}>
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes={compact ? '80px' : '128px'}
            priority={!compact && position != null && position < 4}
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center">
            <HugeiconsIcon
              icon={Image01Icon}
              className={cn(
                'text-foreground-tertiary',
                compact ? 'size-6' : 'size-8',
              )}
            />
          </div>
        )}
      </AspectRatio>
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col justify-between py-0.5',
          compact ? 'min-h-[6.6667rem] gap-2' : 'min-h-[10.6667rem]',
        )}>
        <div>
          <div className="flex items-start gap-2">
            <p
              className={cn(
                'line-clamp-2 min-w-0 flex-1 font-semibold break-keep',
                compact ? 'text-sm leading-5' : 'leading-6',
              )}>
              {title}
            </p>
            {action ? (
              <div className="relative z-20 shrink-0">{action}</div>
            ) : null}
          </div>
          {introduction ? (
            <p
              className={cn(
                'mt-1 break-keep text-foreground-secondary',
                compact
                  ? 'line-clamp-1 text-xs leading-4'
                  : 'line-clamp-2 text-sm leading-5',
              )}>
              {story.oneLineIntro}
            </p>
          ) : null}
          {story.genres.length > 0 ? (
            <div className={compact ? 'mt-1.5' : 'mt-2'}>
              <StoryGenreBadges genres={story.genres} />
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            'mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-foreground-secondary',
            compact ? 'text-xs' : 'text-sm',
          )}>
          <div className="flex items-center gap-1 whitespace-nowrap">
            <HeartOutlineIcon
              className={compact ? 'size-3' : 'size-3.5'}
              aria-hidden="true"
            />
            <p>
              <span className="sr-only">{STORY_LIKE_COPY.count} </span>
              {(story.likeCount ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap">
            <HugeiconsIcon
              icon={BubbleChatIcon}
              className={compact ? 'size-3' : 'size-3.5'}
              aria-hidden="true"
            />
            <p>
              <span className="sr-only">누적 턴 수 </span>
              {(story.turnCount ?? 0).toLocaleString()}
            </p>
          </div>
          {story.createdAt ? (
            <div className="flex items-center gap-1 whitespace-nowrap">
              <HugeiconsIcon
                icon={Calendar04Icon}
                className={compact ? 'size-3' : 'size-3.5'}
                aria-hidden="true"
              />
              <time dateTime={story.createdAt}>
                {formatDate(story.createdAt)}
              </time>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
