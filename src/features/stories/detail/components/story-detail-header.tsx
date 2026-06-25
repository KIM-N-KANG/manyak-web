'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { StoryOptionsMenu } from '@/features/stories/components/story-options-menu';
import { cn } from '@/lib/utils';

type StoryDetailHeaderProps = {
  storyId: string;
  hasScrolled?: boolean;
};

export function StoryDetailHeader({
  storyId,
  hasScrolled = false,
}: StoryDetailHeaderProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background px-1 transition-colors',
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
      <StoryOptionsMenu
        storyId={storyId}
        size="icon-lg"
        onDeleteSuccess={() => router.replace(APP_PATH.MAIN.STORIES)}
      />
    </header>
  );
}
