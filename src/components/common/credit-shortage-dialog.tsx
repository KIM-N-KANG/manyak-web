'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

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
import { APP_PATH } from '@/constants/app-path';
import { type CreditShortageTrigger, track } from '@/observability/analytics';

type CreditShortageDialogProps = {
  trigger: CreditShortageTrigger | null;
  onOpenChange: (open: boolean) => void;
};

/**
 * 회원 크레딧 부족(402·INSUFFICIENT_CREDIT) 시 크레딧 획득(마이페이지)으로 유도하는 알럿 다이얼로그.
 * 게스트 체험 한도의 LoginRequiredDialog와 대칭된다.
 */
export function CreditShortageDialog({
  trigger,
  onOpenChange,
}: CreditShortageDialogProps) {
  const router = useRouter();

  useEffect(() => {
    if (trigger) {
      track('client_creditShortageDialog_shown', { trigger });
    }
  }, [trigger]);

  const handleEarn = () => {
    if (trigger) {
      track('client_creditShortageDialog_earnButton_clicked', { trigger });
    }

    router.push(APP_PATH.MAIN.MY);
  };

  const handleDismiss = () => {
    if (trigger) {
      track('client_creditShortageDialog_dismissed', { trigger });
    }
  };

  return (
    <AlertDialog open={trigger !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>크레딧이 부족해요</AlertDialogTitle>
          <AlertDialogDescription>
            마이페이지에서 출석체크와 친구 초대로 크레딧을 받을 수 있어요
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>
            나중에 하기
          </AlertDialogCancel>
          <AlertDialogAction type="button" onClick={handleEarn}>
            크레딧 받으러 가기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
