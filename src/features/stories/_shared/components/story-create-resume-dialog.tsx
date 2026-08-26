'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type StoryCreateResumeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onDiscard: () => void;
  dismissible?: boolean;
};

export function StoryCreateResumeDialog({
  open,
  onOpenChange,
  onContinue,
  onDiscard,
  dismissible = false,
}: StoryCreateResumeDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      disablePointerDismissal={!dismissible}>
      <DialogContent role="alertdialog" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>만들고 있는 스토리가 있어요</DialogTitle>
          <DialogDescription>
            새로 만들면 임시 저장된 내용은 사라져요
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onDiscard}>
            새로 만들기
          </Button>
          <Button type="button" onClick={onContinue}>
            이어서 만들기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
