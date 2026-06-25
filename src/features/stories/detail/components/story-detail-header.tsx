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
  title: string;
  showTitle: boolean;
};

export function StoryDetailHeader({
  storyId,
  title,
  showTitle,
}: StoryDetailHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-1 bg-background px-1">
      <Button
        type="button"
        size="icon-lg"
        variant="ghost"
        aria-label="이전 페이지로 돌아가기 버튼"
        onClick={() => router.back()}>
        <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
      </Button>

      <span
        aria-hidden="true"
        className={cn(
          'min-w-0 flex-1 truncate font-semibold transition-opacity duration-200 ease-out',
          showTitle ? 'opacity-100' : 'opacity-0',
        )}>
        {title}
      </span>

      <StoryOptionsMenu
        storyId={storyId}
        size="icon-lg"
        onDeleteSuccess={() => router.replace(APP_PATH.MAIN.STORIES)}
      />
    </header>
  );
}
