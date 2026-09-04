'use client';

import { useState } from 'react';

import { ArrowLeft01Icon, Share03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { DELETED_STORY_LABEL } from '@/features/chats/_shared/constants/deleted-story';
import { cn } from '@/lib/utils';
import { track } from '@/observability/analytics';

import { ChatOptionsMenu } from './chat-options-menu';
import { ChatShareDialog } from './chat-share-dialog';

type ChatRoomHeaderProps = {
  chatId: string;
  /** 참조 스토리 ID. 스토리가 삭제되면 null */
  storyId: string | null;
  storyTitle: string;
  turnCount: number;
};

export function ChatRoomHeader({
  chatId,
  storyId,
  storyTitle,
  turnCount,
}: ChatRoomHeaderProps) {
  const router = useRouter();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const goBack = () => router.push(APP_PATH.MAIN.CHATS);

  const openShareDialog = () => {
    track('client_chatShareDialog_shown', {
      chat_id: chatId,
      turn_number: turnCount,
    });
    setIsShareDialogOpen(true);
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-2">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="채팅 목록으로 돌아가기 버튼"
        onClick={goBack}>
        <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
      </Button>
      <h1
        className={cn(
          'min-w-0 flex-1 truncate font-semibold',
          storyId === null && 'text-foreground-tertiary',
        )}>
        {storyId === null ? DELETED_STORY_LABEL : storyTitle}
      </h1>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="채팅 공유하기 버튼"
          onClick={openShareDialog}>
          <HugeiconsIcon icon={Share03Icon} aria-hidden="true" />
        </Button>
        <ChatOptionsMenu chatId={chatId} storyId={storyId} />
      </div>
      <ChatShareDialog
        chatId={chatId}
        turnCount={turnCount}
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />
    </header>
  );
}
