'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { StoryOptionsMenu } from '@/features/stories/components/story-options-menu';

type StoryDetailHeaderProps = {
  storyId: string;
};

export function StoryDetailHeader({ storyId }: StoryDetailHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-background px-1">
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
