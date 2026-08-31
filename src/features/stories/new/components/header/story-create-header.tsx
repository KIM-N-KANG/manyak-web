import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { StoryCreateStep } from '../../types';
import type { DraftSaveStatus } from '../../utils/draft-autosave';
import { StoryCreateStepIndicator } from '../step-layout/story-create-step-indicator';
import { StoryCreateBackDialog } from './story-create-back-dialog';

type StoryCreateHeaderProps = {
  step: StoryCreateStep;
  draftSaveStatus: DraftSaveStatus;
  backDialogOpen: boolean;
  onBackClick: () => void;
  onBackDialogOpenChange: (open: boolean) => void;
  onConfirmBack: () => void;
};

export function StoryCreateHeader({
  step,
  draftSaveStatus,
  backDialogOpen,
  onBackClick,
  onBackDialogOpenChange,
  onConfirmBack,
}: StoryCreateHeaderProps) {
  return (
    <>
      <header className="flex shrink-0 flex-col bg-background">
        <div className="flex h-14 items-center gap-2 px-4">
          <h1 className="font-semibold">스토리 만들기</h1>
          <div className="ml-auto flex items-center gap-1">
            {draftSaveStatus !== 'hidden' && (
              <Badge
                variant="secondary"
                aria-live="polite"
                className={cn(
                  'h-auto px-2.5 py-1 text-sm',
                  draftSaveStatus === 'saved' && 'bg-primary/10 text-primary',
                )}>
                {draftSaveStatus === 'saving' ? '임시 저장중' : '임시 저장됨'}
              </Badge>
            )}
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
        open={backDialogOpen}
        onOpenChange={onBackDialogOpenChange}
        onConfirm={onConfirmBack}
      />
    </>
  );
}
