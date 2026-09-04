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

/**
 * 이탈 확인 다이얼로그의 종류. `saved`는 내용이 보존돼 이어서 만들 수 있는 이탈,
 * `lost`는 저장할 수 없어(생성 실패 등) 내용이 사라지는 이탈이다.
 */
export type StoryCreateBackDialogVariant = 'saved' | 'lost';

export const STORY_CREATE_BACK_DIALOG_COPY = {
  saved: {
    title: '스토리 만들기를 그만둘까요?',
    description: '만들던 내용은 제작 탭의 이어서 만들기에서 계속할 수 있어요',
    cancel: '닫기',
    confirm: '나가기',
  },
  lost: {
    title: '스토리를 그만 만들까요?',
    description: '지금 나가면 만들고 있는 내용이 사라져요',
    cancel: '계속 만들기',
    confirm: '그만 만들기',
  },
} as const satisfies Record<
  StoryCreateBackDialogVariant,
  { title: string; description: string; cancel: string; confirm: string }
>;

type StoryCreateBackDialogProps = {
  variant: StoryCreateBackDialogVariant | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

/**
 * 퍼널 이탈 확인 다이얼로그. 사라지는 대상이 달라 문구를 합치지 않고,
 * 보존되는 이탈(`saved`)과 소실되는 이탈(`lost`)을 variant로 나눈다(Android 패리티).
 */
export function StoryCreateBackDialog({
  variant,
  onOpenChange,
  onConfirm,
}: StoryCreateBackDialogProps) {
  const copy = STORY_CREATE_BACK_DIALOG_COPY[variant ?? 'lost'];

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
