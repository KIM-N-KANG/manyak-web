'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { cn } from '@/lib/utils';

type ChatRoomHeaderProps = {
  storyTitle: string;
  hasScrolled: boolean;
};

export function ChatRoomHeader({
  storyTitle,
  hasScrolled,
}: ChatRoomHeaderProps) {
  const router = useRouter();

  const goBack = () => router.push(APP_PATH.MAIN.CHATS);

  return (
    <>
      <Button
        type="button"
        size="icon-lg"
        variant="ghost"
        aria-label="채팅 목록으로 돌아가기 버튼"
        onClick={goBack}
        className="absolute top-2 left-1 z-50 bg-background/70 backdrop-blur-sm">
        <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
      </Button>

      <header
        aria-hidden={hasScrolled}
        className={cn(
          'flex items-center overflow-hidden bg-background pr-4 pl-14 transition-[height,opacity] duration-200',
          hasScrolled ? 'h-0 opacity-0' : 'h-16 opacity-100',
        )}>
        <h1 className="truncate text-lg font-semibold">{storyTitle}</h1>
      </header>
    </>
  );
}
