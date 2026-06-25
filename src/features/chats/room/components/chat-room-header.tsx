'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { cn } from '@/lib/utils';

type ChatRoomHeaderProps = {
  storyTitle: string;
  isVisible: boolean;
  hasScrolled: boolean;
};

export function ChatRoomHeader({
  storyTitle,
  isVisible,
  hasScrolled,
}: ChatRoomHeaderProps) {
  const router = useRouter();

  const goBack = () => router.push(APP_PATH.MAIN.CHATS);

  return (
    <header
      aria-hidden={!isVisible}
      className={cn(
        'absolute inset-x-0 top-0 z-50 flex h-14 items-center gap-2 border-b bg-background pr-4 pl-2 transition-[translate,border-color] duration-300 ease-out',
        isVisible ? 'translate-y-0' : '-translate-y-full',
        hasScrolled ? 'border-border' : 'border-transparent',
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
