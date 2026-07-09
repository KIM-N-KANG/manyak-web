'use client';

import { useEffect } from 'react';

import { usePathname, useRouter } from 'next/navigation';

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
import { type GuestLimitTrigger, track } from '@/observability/analytics';

type LoginRequiredDialogProps = {
  trigger: GuestLimitTrigger | null;
  onOpenChange: (open: boolean) => void;
};

export function LoginRequiredDialog({
  trigger,
  onOpenChange,
}: LoginRequiredDialogProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (trigger) {
      track('client_guestLimitDialog_shown', { trigger });
    }
  }, [trigger]);

  const handleLogin = () => {
    if (trigger) {
      track('client_guestLimitDialog_loginButton_clicked', { trigger });
    }

    router.push(
      `${APP_PATH.LOGIN}?callbackUrl=${encodeURIComponent(pathname)}`,
    );
  };

  const handleDismiss = () => {
    if (trigger) {
      track('client_guestLimitDialog_dismissed', { trigger });
    }
  };

  return (
    <AlertDialog open={trigger !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>로그인이 필요해요</AlertDialogTitle>
          <AlertDialogDescription>
            게스트 체험 횟수를 모두 사용했어요. 로그인하면 크레딧으로 횟수 제한
            없이 이용할 수 있고, 지금까지 만든 스토리와 채팅도 계정으로
            옮겨드려요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>나중에</AlertDialogCancel>
          <AlertDialogAction type="button" onClick={handleLogin}>
            로그인하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
