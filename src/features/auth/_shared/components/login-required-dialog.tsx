'use client';

import { useEffect } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { APP_PATH } from '@/constants/app-path';
import { GoogleLogo } from '@/features/auth/_shared/components/google-logo';
import { resolveLoginCallbackUrl } from '@/features/auth/_shared/utils/login-callback-url';
import { type GuestLimitTrigger, track } from '@/observability/analytics';

type LoginRequiredDialogProps = {
  trigger: GuestLimitTrigger | null;
  onOpenChange: (open: boolean) => void;
};

export function LoginRequiredDialog({
  trigger,
  onOpenChange,
}: LoginRequiredDialogProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (trigger) {
      track('client_guestLimitDialog_shown', { trigger });
    }
  }, [trigger]);

  const handleGoogleLogin = () => {
    if (trigger) {
      track('client_guestLimitDialog_loginButton_clicked', { trigger });
    }

    void signIn('google', {
      redirectTo: resolveLoginCallbackUrl(pathname),
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && trigger) {
      track('client_guestLimitDialog_dismissed', { trigger });
    }

    onOpenChange(open);
  };

  return (
    <Dialog open={trigger !== null} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>게스트 체험 횟수를 모두 사용했어요</DialogTitle>
          <DialogDescription>
            로그인하면 횟수 제한 없이 이용할 수 있고, 지금까지 만든 스토리와
            채팅도 1회 한정으로 옮겨드려요
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="grid-cols-1 gap-3">
          <Button type="button" variant="outline" onClick={handleGoogleLogin}>
            <GoogleLogo className="size-4" />
            Google로 시작하기
          </Button>
          <p className="text-center text-xs leading-relaxed text-foreground-secondary">
            로그인 시{' '}
            <Link href={APP_PATH.TERMS} className="underline">
              서비스이용약관
            </Link>{' '}
            및{' '}
            <Link href={APP_PATH.PRIVACY} className="underline">
              개인정보처리방침
            </Link>
            에 동의하는 것으로 간주해요
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-foreground-tertiary hover:bg-transparent hover:text-foreground dark:hover:bg-transparent"
            onClick={() => handleOpenChange(false)}>
            나중에 하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
