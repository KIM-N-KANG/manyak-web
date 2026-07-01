'use client';

import { BubbleChatIcon, Calendar04Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { APP_PATH } from '@/constants/app-path';
import { ChatOptionsMenu } from '@/features/chats/components/chat-options-menu';
import { SCREEN, track, useImpression } from '@/lib/analytics';
import { formatRelativeDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';

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

  return (
    <article ref={impressionRef} className="relative flex flex-col gap-1 p-4">
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
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 font-semibold">{chat.storyTitle}</p>
          <ChatOptionsMenu
            chatId={chat.id}
            size="icon-xs"
            triggerClassName="relative z-10"
          />
        </div>
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
          <p>{chat.chatCount}</p>
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
    </article>
  );
}
