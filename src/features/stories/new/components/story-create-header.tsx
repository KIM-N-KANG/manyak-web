'use client';

import { useState } from 'react';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { StoryCreateBackDialog } from './story-create-back-dialog';

type StoryCreateHeaderProps = {
  requiresBackConfirmation?: boolean;
  hasScrolled?: boolean;
};

export function StoryCreateHeader({
  requiresBackConfirmation = false,
  hasScrolled = false,
}: StoryCreateHeaderProps) {
  const router = useRouter();
  const [confirmBackDialogOpen, setConfirmBackDialogOpen] = useState(false);

  const handleBackClick = () => {
    if (requiresBackConfirmation) {
      setConfirmBackDialogOpen(true);

      return;
    }

    router.back();
  };

  const handleConfirmBack = () => {
    setConfirmBackDialogOpen(false);
    router.back();
  };

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 flex h-16 items-center border-b bg-background pr-4 pl-1 transition-colors',
          hasScrolled ? 'border-border' : 'border-transparent',
        )}>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-lg"
            variant="ghost"
            aria-label="이전 페이지로 돌아가기 버튼"
            onClick={handleBackClick}>
            <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
          </Button>
          <h1 className="text-lg font-semibold">스토리 만들기</h1>
        </div>
      </header>
      <StoryCreateBackDialog
        open={confirmBackDialogOpen}
        onOpenChange={setConfirmBackDialogOpen}
        onConfirm={handleConfirmBack}
      />
    </>
  );
}
