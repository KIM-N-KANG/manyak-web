import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import { DraftSaveButton } from '@/features/stories/_shared/components/draft-save-button';
import type { DraftExitDialog } from '@/features/stories/_shared/constants/draft-exit-warning';

import type { StoryCreateStep } from '../../types';
import { StoryCreateStepIndicator } from '../step-layout/story-create-step-indicator';
import { StoryCreateBackDialog } from './story-create-back-dialog';

type StoryCreateHeaderProps = {
  step: StoryCreateStep;
  isSavingDraft: boolean;
  canSaveDraft: boolean;
  isDraftSaved: boolean;
  onSaveDraft: () => Promise<boolean>;
  backDialog: DraftExitDialog | null;
  onBackClick: () => void;
  onBackDialogOpenChange: (open: boolean) => void;
  onConfirmBack: () => void;
};

export function StoryCreateHeader({
  step,
  isSavingDraft,
  canSaveDraft,
  isDraftSaved,
  onSaveDraft,
  backDialog,
  onBackClick,
  onBackDialogOpenChange,
  onConfirmBack,
}: StoryCreateHeaderProps) {
  return (
    <>
      <header className="flex shrink-0 flex-col bg-background">
        <div className="flex h-14 items-center gap-2 px-4">
          <h1 className="font-semibold">스토리 간편 제작</h1>
          <div className="ml-auto flex items-center gap-1">
            <DraftSaveButton
              isSaving={isSavingDraft}
              disabled={!canSaveDraft}
              isSaved={isDraftSaved}
              onSave={onSaveDraft}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="스토리 만들기 닫기"
              onClick={onBackClick}>
              <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="px-4 pb-4">
          <StoryCreateStepIndicator step={step} />
        </div>
      </header>
      <StoryCreateBackDialog
        variant={backDialog}
        onOpenChange={onBackDialogOpenChange}
        onConfirm={onConfirmBack}
      />
    </>
  );
}
