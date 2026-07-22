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

type StoryCreateBackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

/**
 * 이탈 소실 경고 다이얼로그. 내용이 보존되는 이탈은 묻지 않고 즉시 나가므로,
 * 저장할 수 없는 이탈(생성 실패 등)에서만 열린다.
 */
export function StoryCreateBackDialog({
  open,
  onOpenChange,
  onConfirm,
}: StoryCreateBackDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>스토리를 그만 만들까요?</AlertDialogTitle>
          <AlertDialogDescription>
            지금 나가면 만들고 있는 내용이 사라져요
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>계속 만들기</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            onClick={onConfirm}>
            그만 만들기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
