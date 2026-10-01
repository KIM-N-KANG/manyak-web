'use client';

import { useState } from 'react';

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
import {
  DRAFT_EXIT_WARNING_COPY,
  type DraftExitWarning,
} from '@/features/stories/_shared/constants/draft-exit-warning';

type StoryCreateBackDialogProps = {
  variant: DraftExitWarning | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function StoryCreateBackDialog({
  variant,
  onOpenChange,
  onConfirm,
}: StoryCreateBackDialogProps) {
  // 닫힘 애니메이션 동안 variant가 null이 되어도 마지막 문구를 유지한다(렌더 중 setState).
  const [shownVariant, setShownVariant] = useState(variant ?? 'nothing');

  if (variant !== null && variant !== shownVariant) {
    setShownVariant(variant);
  }

  const copy = DRAFT_EXIT_WARNING_COPY[shownVariant];

  return (
    <AlertDialog open={variant !== null} onOpenChange={onOpenChange}>
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
            onClick={onConfirm}>
            {copy.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
