import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';

import type { StoryCreateStep } from '../../types';
import { StoryCreateStepIndicator } from '../step-layout/story-create-step-indicator';
import { StoryCreateBackDialog } from './story-create-back-dialog';
import { StoryCreateCreditInfoPopover } from './story-create-credit-info-popover';

type StoryCreateHeaderProps = {
  step: StoryCreateStep;
  backDialogOpen: boolean;
  onBackClick: () => void;
  onBackDialogOpenChange: (open: boolean) => void;
  onConfirmBack: () => void;
};

export function StoryCreateHeader({
  step,
  backDialogOpen,
  onBackClick,
  onBackDialogOpenChange,
  onConfirmBack,
}: StoryCreateHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-50 flex flex-col bg-background">
        <div className="flex h-14 items-center justify-between pr-4 pl-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="이전 페이지로 돌아가기 버튼"
              onClick={onBackClick}>
              <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
            </Button>
            <h1 className="font-semibold">스토리 만들기</h1>
          </div>
          <StoryCreateCreditInfoPopover />
        </div>
        <div className="px-14 pb-4">
          <StoryCreateStepIndicator step={step} />
        </div>
      </header>
      <StoryCreateBackDialog
        open={backDialogOpen}
        onOpenChange={onBackDialogOpenChange}
        onConfirm={onConfirmBack}
      />
    </>
  );
}
