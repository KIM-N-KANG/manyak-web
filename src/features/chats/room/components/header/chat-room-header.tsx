'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { HomeOutlineIcon } from '@/components/icons/home-outline-icon';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';

import { ChatOptionsMenu } from './chat-options-menu';

type ChatRoomHeaderProps = {
  chatId: string;
  storyTitle: string;
};

export function ChatRoomHeader({ chatId, storyTitle }: ChatRoomHeaderProps) {
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
      <h1 className="min-w-0 flex-1 truncate font-semibold">{storyTitle}</h1>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="홈 화면으로 이동 버튼"
          onClick={() => router.push(APP_PATH.MAIN.STORIES)}>
          <HomeOutlineIcon aria-hidden="true" />
        </Button>
        <ChatOptionsMenu chatId={chatId} />
      </div>
    </header>
  );
}
