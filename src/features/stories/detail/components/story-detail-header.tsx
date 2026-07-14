'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m } from 'motion/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { StoryOptionsMenu } from '@/features/stories/_shared/components/story-options-menu';

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
    <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-2">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="이전 페이지로 돌아가기 버튼"
        onClick={() => router.back()}>
        <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
      </Button>

      <m.span
        aria-hidden="true"
        initial={false}
        animate={{ opacity: showTitle ? 1 : 0, y: showTitle ? 0 : 4 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="min-w-0 flex-1 truncate font-semibold">
        {title}
      </m.span>

      <StoryOptionsMenu
        storyId={storyId}
        size="icon"
        onDeleteSuccess={() => router.replace(APP_PATH.MAIN.STORIES)}
      />
    </header>
  );
}
