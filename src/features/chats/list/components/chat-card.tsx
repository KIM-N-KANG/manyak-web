import { BubbleChatIcon, Calendar04Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { APP_PATH } from '@/constants/app-path';
import { ChatOptionsMenu } from '@/features/chats/components/chat-options-menu';
import { formatRelativeDate } from '@/lib/format-date';

import type { ChatListItem } from '../types';

type ChatCardProps = {
  chat: ChatListItem;
};

export function ChatCard({ chat }: ChatCardProps) {
  return (
    <article className="relative flex flex-col gap-2 px-4 py-2">
      <Link
        href={APP_PATH.CHAT_ROOM(chat.id)}
        aria-label={`${chat.storyTitle} 채팅 보기`}
        className="absolute inset-0 rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      />
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 leading-6 font-semibold">
            {chat.storyTitle}
          </p>
          <ChatOptionsMenu
            chatId={chat.id}
            size="icon-xs"
            triggerClassName="relative z-10"
          />
        </div>
        <p className="line-clamp-1 leading-4 text-foreground-secondary">
          {chat.lastStoryPreview || '채팅을 시작하고 이야기를 이어가 보세요'}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3">
        <div className="flex items-center gap-1.5 text-sm text-foreground-secondary">
          <HugeiconsIcon
            icon={BubbleChatIcon}
            className="size-4"
            aria-hidden="true"
          />
          <p>{chat.chatCount}</p>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-foreground-secondary">
          <HugeiconsIcon
            icon={Calendar04Icon}
            className="size-4"
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
