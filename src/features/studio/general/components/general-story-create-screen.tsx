'use client';

import { useState } from 'react';

import { Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { EmptyListNotice } from '@/components/common/empty-list-notice';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { APP_PATH } from '@/constants/app-path';
import {
  GENERAL_STORY_CREATE_COPY,
  GENERAL_STORY_EXIT_WARNING_COPY,
  type GeneralStoryExitWarning,
} from '@/features/studio/general/constants';
import { cn } from '@/lib/utils';

type DraftSaveStatus = 'idle' | 'saving' | 'saved';

type DraftSaveButtonProps = {
  status: DraftSaveStatus;
  canSave: boolean;
  onClick: () => void;
};

function DraftSaveButton({ status, canSave, onClick }: DraftSaveButtonProps) {
  const isSaved = status === 'saved';

  return (
    <Button
      type="button"
      variant="outline"
      disabled={!canSave || status !== 'idle'}
      onClick={onClick}
      className={cn(
        'relative',
        status !== 'idle' && 'disabled:opacity-100',
        isSaved && 'border-transparent bg-primary/10 text-primary',
      )}>
      <span
        className={cn(
          'flex items-center gap-1',
          status === 'saving' && 'invisible',
        )}>
        {isSaved && <HugeiconsIcon icon={Tick02Icon} aria-hidden="true" />}
        {isSaved
          ? GENERAL_STORY_CREATE_COPY.draftSaved
          : GENERAL_STORY_CREATE_COPY.draftSave}
      </span>
      {status === 'saving' && <Spinner className="absolute" />}
    </Button>
  );
}

export function GeneralStoryCreateScreen() {
  const router = useRouter();
  const [exitWarning, setExitWarning] =
    useState<GeneralStoryExitWarning>('nothing');
  const [isExitOpen, setIsExitOpen] = useState(false);

  const hasUnsavedChanges = false;
  const hasSavedDraft = false;

  const handleClose = () => {
    setExitWarning(
      hasUnsavedChanges ? 'unsaved' : hasSavedDraft ? 'saved' : 'nothing',
    );
    setIsExitOpen(true);
  };

  const copy = GENERAL_STORY_EXIT_WARNING_COPY[exitWarning];

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-4">
        <h1 className="font-semibold">{GENERAL_STORY_CREATE_COPY.title}</h1>
        <div className="ml-auto flex items-center gap-1">
          <DraftSaveButton
            status="idle"
            canSave={hasUnsavedChanges}
            onClick={() => {}}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={GENERAL_STORY_CREATE_COPY.close}
            onClick={handleClose}>
            <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
          </Button>
        </div>
      </header>
      <EmptyListNotice>{GENERAL_STORY_CREATE_COPY.preparing}</EmptyListNotice>
      <AlertDialog open={isExitOpen} onOpenChange={setIsExitOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={() => router.replace(APP_PATH.MAIN.STUDIO)}>
              {copy.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
