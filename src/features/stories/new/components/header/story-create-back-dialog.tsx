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
  /** 나가면 내용이 보존(임시 저장·진행 중 복구)되는 상태인지 — 문구·버튼 분기 */
  willSaveDraft: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function StoryCreateBackDialog({
  open,
  willSaveDraft,
  onOpenChange,
  onConfirm,
}: StoryCreateBackDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {willSaveDraft
              ? '나중에 이어서 만들까요?'
              : '스토리를 그만 만들까요?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {willSaveDraft
              ? '지금까지 만든 내용은 임시 저장돼요'
              : '지금 나가면 만들고 있는 내용이 사라져요'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>계속 만들기</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant={willSaveDraft ? 'default' : 'destructive'}
            onClick={onConfirm}>
            {willSaveDraft ? '나중에 만들기' : '그만 만들기'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
