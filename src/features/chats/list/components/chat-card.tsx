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
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { APP_PATH } from '@/constants/app-path';
import { DELETED_STORY_LABEL } from '@/features/chats/_shared/constants/deleted-story';
import { useDeleteCreatedChat } from '@/features/chats/_shared/hooks/use-delete-created-chat';
import { StoryReportSheet } from '@/features/stories/_shared/components/story-report-sheet';
import { STORY_REPORT_COPY } from '@/features/stories/_shared/constants/story-report';
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

  return (
    <article
      ref={impressionRef}
      className="relative flex items-center gap-4 px-4 py-2">
      <Link
        href={APP_PATH.CHAT_ROOM(chat.id)}
        aria-label={`${chatDisplayTitle(chat)} 채팅 보기`}
        className="absolute inset-0"
        onClick={() =>
          track('client_chatList_chatCard_clicked', {
            chat_id: chat.id,
            position,
          })
        }
      />
      <ChatCardBody chat={chat} action={<ChatCardOptions chat={chat} />} />
    </article>
  );
}

/**
 * 카드 제목 줄에 보일 문구를 반환한다. 참조 스토리가 삭제되면 서버가 제목을 비워 보내므로
 * 그 자리에 상태 문구를 쓴다.
 *
 * @param chat 채팅 목록 항목
 * @returns 스토리 제목 또는 삭제된 스토리 문구
 */
function chatDisplayTitle(chat: ChatListItem) {
  return chat.storyTitle?.trim() || DELETED_STORY_LABEL;
}

/** 카드 옵션의 props. 신고 대상은 참조 스토리라 삭제된 스토리의 채팅에는 신고 항목을 두지 않는다. */
type ChatCardOptionsProps = {
  chat: ChatListItem;
};

function ChatCardOptions({ chat }: ChatCardOptionsProps) {
  const { status } = useSession();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const { deleteChat, isPending } = useDeleteCreatedChat(chat.id);
  const canReport =
    status === 'authenticated' && Boolean(chat.storyTitle?.trim());

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
    onSelect: deleteChat,
    confirm: {
      title: '채팅을 삭제할까요?',
      description: '삭제하면 나눈 이야기가 모두 사라지며 되돌릴 수 없어요',
      isPending,
    },
  });

  return (
    <>
      <CardOptionsDialog
        title="채팅 옵션"
        triggerAriaLabel="채팅 옵션 더보기"
        items={items}
        preview={<ChatCardBody chat={chat} compact />}
      />
      {canReport && (
        <StoryReportSheet
          storyId={chat.storyId}
          source="chatList"
          open={isReportOpen}
          onOpenChange={setIsReportOpen}
        />
      )}
    </>
  );
}

/**
 * 카드 본체의 props. 목록 카드와 옵션 다이얼로그의 축소판이 같은 마크업을 쓰되, 축소판은
 * `compact`로 표지·서체를 한 단계씩 줄이고 링크·노출 추적·옵션 버튼을 두지 않는다.
 */
type ChatCardBodyProps = {
  chat: ChatListItem;
  compact?: boolean;
  /** 제목 줄 오른쪽 끝에 놓는 요소(옵션 버튼) */
  action?: React.ReactNode;
};

function ChatCardBody({ chat, compact = false, action }: ChatCardBodyProps) {
  const thumbnailUrl = chat.thumbnailUrlSm ?? null;
  const isStoryDeleted = !chat.storyTitle?.trim();

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-center',
        compact ? 'gap-3' : 'gap-4',
      )}>
      <AspectRatio
        ratio={3 / 4}
        className={cn(
          'shrink-0 overflow-hidden rounded-sm border border-border bg-muted',
          compact ? 'w-10' : 'w-12',
        )}>
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes={compact ? '40px' : '48px'}
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
                compact ? 'size-4' : 'size-5',
              )}
            />
          </div>
        )}
      </AspectRatio>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-start gap-2">
            <p
              className={cn(
                'line-clamp-1 min-w-0 flex-1 font-semibold',
                compact ? 'text-sm leading-5' : 'leading-6',
                isStoryDeleted && 'text-foreground-tertiary',
              )}>
              {chatDisplayTitle(chat)}
            </p>
            {action ? (
              <div className="relative z-20 shrink-0">{action}</div>
            ) : null}
          </div>
          <p
            className={cn(
              'line-clamp-1',
              compact ? 'text-xs leading-3' : 'text-sm leading-3.5',
              chat.lastStoryPreview
                ? 'text-foreground-secondary'
                : 'text-foreground-tertiary',
            )}>
            {chat.lastStoryPreview || CHAT_LIST_COPY.emptyPreview}
          </p>
        </div>
        <div
          className={cn(
            'flex items-center justify-end gap-2 text-foreground-secondary',
            compact ? 'text-xs' : 'text-sm',
          )}>
          <div className="flex items-center gap-1">
            <HugeiconsIcon
              icon={BubbleChatIcon}
              className={compact ? 'size-3' : 'size-3.5'}
              aria-hidden="true"
            />
            <p>{chat.turnCount}</p>
          </div>
          <div className="flex items-center gap-1">
            <HugeiconsIcon
              icon={Calendar04Icon}
              className={compact ? 'size-3' : 'size-3.5'}
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
    </div>
  );
}
