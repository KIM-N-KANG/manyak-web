'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m } from 'motion/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { StoryOptionsMenu } from '@/features/stories/components/story-options-menu';
import { cn } from '@/lib/utils';

type StoryDetailHeaderProps = {
  storyId: string;
  title: string;
  showTitle: boolean;
  /** 헤더 뒤로 썸네일이 비치도록 배경을 투명하게 띄우는 오버레이 모드 */
  overlay?: boolean;
};

export function StoryDetailHeader({
  storyId,
  title,
  showTitle,
  overlay = false,
}: StoryDetailHeaderProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        'absolute inset-x-0 top-0 z-50 flex h-14 items-center gap-2 px-2 transition-colors',
        overlay ? 'bg-transparent' : 'bg-background',
      )}>
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
