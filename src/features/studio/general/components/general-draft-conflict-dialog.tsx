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
import { DRAFT_CONFLICT_COPY } from '@/features/stories/_shared/constants/draft-conflict';

type GeneralDraftConflictDialogProps = {
  open: boolean;
  /** 서버 내용을 그대로 두고 닫는다. 바깥 누르기와 뒤로가기로 닫을 때도 부른다. */
  onKeep: () => void;
  /** 지금 내용으로 덮어쓴다. */
  onSave: () => void;
};

export function GeneralDraftConflictDialog({
  open,
  onKeep,
  onSave,
}: GeneralDraftConflictDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onKeep();
      }}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{DRAFT_CONFLICT_COPY.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {DRAFT_CONFLICT_COPY.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{DRAFT_CONFLICT_COPY.keep}</AlertDialogCancel>
          <AlertDialogAction type="button" onClick={onSave}>
            {DRAFT_CONFLICT_COPY.save}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
