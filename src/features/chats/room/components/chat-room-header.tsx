'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { cn } from '@/lib/utils';

import { CHAT_HEADER_HEIGHT_CLASS } from '../lib/constants';

type ChatRoomHeaderProps = {
  storyTitle: string;
  isVisible: boolean;
};

export function ChatRoomHeader({ storyTitle, isVisible }: ChatRoomHeaderProps) {
  const router = useRouter();

  const goBack = () => router.push(APP_PATH.MAIN.CHATS);

  return (
    <header
      aria-hidden={!isVisible}
      inert={!isVisible}
      className={cn(
        'absolute inset-x-0 top-0 z-50 flex items-center gap-2 bg-background px-2 pr-4 transition-[translate] duration-300 ease-out',
        CHAT_HEADER_HEIGHT_CLASS,
        isVisible ? 'translate-y-0' : '-translate-y-full',
      )}>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="채팅 목록으로 돌아가기 버튼"
        onClick={goBack}>
        <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
      </Button>
      <h1 className="min-w-0 truncate font-semibold">{storyTitle}</h1>
    </header>
  );
}
