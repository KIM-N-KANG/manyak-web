'use client';

import { useState } from 'react';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

import type { StoryCreateStep } from '../types';
import { StoryCreateBackDialog } from './story-create-back-dialog';
import { StoryCreateStepIndicator } from './story-create-step-indicator';

type StoryCreateHeaderProps = {
  step: StoryCreateStep;
  requiresBackConfirmation?: boolean;
};

export function StoryCreateHeader({
  step,
  requiresBackConfirmation = false,
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
      <header className="sticky top-0 z-50 flex flex-col bg-background">
        <div className="flex h-14 items-center pr-4 pl-1">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-lg"
              variant="ghost"
              aria-label="이전 페이지로 돌아가기 버튼"
              onClick={handleBackClick}>
              <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
            </Button>
            <h1 className="font-semibold">스토리 만들기</h1>
          </div>
        </div>
        <div className="px-14 pb-4">
          <StoryCreateStepIndicator step={step} />
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
