'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { DELETED_STORY_LABEL } from '@/features/chats/_shared/constants/deleted-story';
import { cn } from '@/lib/utils';

import { ChatMenuDrawer } from './chat-menu-drawer';

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

  const goBack = () => router.push(APP_PATH.MAIN.CHATS);

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
      <ChatMenuDrawer chatId={chatId} storyId={storyId} turnCount={turnCount} />
    </header>
  );
}
