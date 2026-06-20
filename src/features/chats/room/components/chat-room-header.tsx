'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
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

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-16 items-center gap-1 border-b bg-background pr-4 pl-1 transition-colors',
        hasScrolled ? 'border-border' : 'border-transparent',
      )}>
      <Button
        type="button"
        size="icon-lg"
        variant="ghost"
        aria-label="이전 페이지로 돌아가기 버튼"
        onClick={() => router.back()}>
        <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
      </Button>
      <h1 className="truncate text-lg font-semibold">{storyTitle}</h1>
    </header>
  );
}
