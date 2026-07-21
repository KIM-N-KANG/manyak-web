'use client';

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

type StoryCreateResumeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onDiscard: () => void;
};

export function StoryCreateResumeDialog({
  open,
  onOpenChange,
  onContinue,
  onDiscard,
}: StoryCreateResumeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>만들다 만 스토리가 있어요</AlertDialogTitle>
          <AlertDialogDescription>
            이어서 만들까요? 새로 만들면 임시 저장된 내용은 사라져요
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>새로 만들기</AlertDialogCancel>
          <AlertDialogAction type="button" onClick={onContinue}>
            이어서 만들기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
