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

  // TODO: 백엔드 목록 응답에 썸네일이 추가되면 연결한다.
  const thumbnailUrl: string | null = null;

  return (
    <article
      ref={impressionRef}
      className="relative flex items-center gap-4 p-4">
      <Link
        href={APP_PATH.CHAT_ROOM(chat.id)}
        aria-label={`${chat.storyTitle} 채팅 보기`}
        className="absolute inset-0"
        onClick={() =>
          track('client_chatList_chatCard_clicked', {
            chat_id: chat.id,
            position,
          })
        }
      />
      {/* 스토리 목록과 같은 3:4 크롭을 유지해 커버 이미지 인지 일관성을 지킨다.
          백엔드 썸네일 호스트가 확정되면 next.config remotePatterns에
          등록하고 unoptimized를 제거한다. */}
      <AspectRatio
        ratio={3 / 4}
        className="w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="48px"
            unoptimized
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
          <p className="line-clamp-1 font-semibold">{chat.storyTitle}</p>
          <p
            className={cn(
              'line-clamp-1 text-sm leading-3.5',
              chat.lastStoryPreview
                ? 'text-foreground-secondary'
                : 'text-foreground-tertiary',
            )}>
            {chat.lastStoryPreview || '채팅을 시작하고 이야기를 이어가 보세요'}
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
