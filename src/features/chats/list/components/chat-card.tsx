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
import { formatRelativeDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { SCREEN, track, useImpression } from '@/observability/analytics';

import { CHAT_LIST_COPY } from '../constants';
import type { ChatListItem } from '../types';

type ChatCardProps = {
  chat: ChatListItem;
  position?: number;
};

export function ChatCard({ chat, position }: ChatCardProps) {
  const impressionRef = useImpression({
    object: 'chatCard',
    itemId: chat.id,
    screen: SCREEN.CHAT_LIST,
    onImpress: () =>
      track('client_chatList_chatCard_impressed', {
        chat_id: chat.id,
        position,
      }),
  });

  const thumbnailUrl = chat.thumbnailUrlSm ?? null;
  // 참조 스토리가 삭제되면 서버가 제목을 비워 보낸다. 제목 줄을 지우면 카드가 무엇의 채팅인지
  // 알 수 없어지므로 그 자리에 상태를 적는다.
  const storyTitle = chat.storyTitle?.trim();
  const isStoryDeleted = !storyTitle;
  const displayTitle = isStoryDeleted
    ? CHAT_LIST_COPY.deletedStory
    : storyTitle;

  return (
    <article
      ref={impressionRef}
      className="relative flex items-center gap-4 px-4 py-2">
      <Link
        href={APP_PATH.CHAT_ROOM(chat.id)}
        aria-label={`${displayTitle} 채팅 보기`}
        className="absolute inset-0"
        onClick={() =>
          track('client_chatList_chatCard_clicked', {
            chat_id: chat.id,
            position,
          })
        }
      />
      <AspectRatio
        ratio={3 / 4}
        className="w-12 shrink-0 overflow-hidden rounded-sm border border-border bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center">
            <HugeiconsIcon
              icon={Image01Icon}
              className="size-5 text-foreground-tertiary"
            />
          </div>
        )}
      </AspectRatio>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-col gap-0.5">
          <p
            className={cn(
              'line-clamp-1 font-semibold',
              isStoryDeleted && 'text-foreground-tertiary',
            )}>
            {displayTitle}
          </p>
          <p
            className={cn(
              'line-clamp-1 text-sm leading-3.5',
              chat.lastStoryPreview
                ? 'text-foreground-secondary'
                : 'text-foreground-tertiary',
            )}>
            {chat.lastStoryPreview || CHAT_LIST_COPY.emptyPreview}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <div className="flex items-center gap-1 text-sm text-foreground-secondary">
            <HugeiconsIcon
              icon={BubbleChatIcon}
              className="size-3.5"
              aria-hidden="true"
            />
            <p>{chat.turnCount}</p>
          </div>
          <div className="flex items-center gap-1 text-sm text-foreground-secondary">
            <HugeiconsIcon
              icon={Calendar04Icon}
              className="size-3.5"
              aria-hidden="true"
            />
            <time
              dateTime={chat.updatedAt}
              title={new Date(chat.updatedAt).toLocaleString('ko-KR')}>
              {formatRelativeDate(chat.updatedAt)}
            </time>
          </div>
        </div>
      </div>
    </article>
  );
}
