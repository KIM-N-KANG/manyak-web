'use client';

import { useEffect } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
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
import { KakaoLogo } from '@/features/auth/_shared/components/kakao-logo';
import {
  SOCIAL_LOGIN_PENDING_LABEL,
  useSocialLogin,
} from '@/features/auth/_shared/hooks/use-social-login';
import { resolveLoginCallbackUrl } from '@/features/auth/_shared/utils/login-callback-url';
import type { SocialLoginProvider } from '@/lib/auth/social-provider';
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
  const { pendingProvider, startLogin } = useSocialLogin();

  useEffect(() => {
    if (trigger) {
      track('client_guestLimitDialog_shown', { trigger });
    }
  }, [trigger]);

  const handleSocialLogin = (provider: SocialLoginProvider) => {
    if (trigger) {
      track('client_guestLimitDialog_loginButton_clicked', {
        trigger,
        provider,
      });
    }

    void startLogin({
      provider,
      redirectTo: resolveLoginCallbackUrl(pathname),
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && pendingProvider !== null) {
      return;
    }

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
            로그인하면 횟수 제한 없이 이용할 수 있고, 만든 스토리와 채팅도
            계정당 한 번 옮겨드려요
          </DialogDescription>
        </DialogHeader>
        <div className="flex w-full flex-col gap-2">
          <Button
            type="button"
            className="relative bg-[#FEE500] text-[#191919] hover:bg-[#FEE500]/80"
            disabled={pendingProvider !== null}
            onClick={() => handleSocialLogin('kakao')}>
            <LoadingButtonContent
              isLoading={pendingProvider === 'kakao'}
              loadingLabel={SOCIAL_LOGIN_PENDING_LABEL}>
              <KakaoLogo className="size-4" />
              카카오로 시작하기
            </LoadingButtonContent>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="relative"
            disabled={pendingProvider !== null}
            onClick={() => handleSocialLogin('google')}>
            <LoadingButtonContent
              isLoading={pendingProvider === 'google'}
              loadingLabel={SOCIAL_LOGIN_PENDING_LABEL}>
              <GoogleLogo className="size-4" />
              Google로 시작하기
            </LoadingButtonContent>
          </Button>
        </div>
        <DialogFooter className="grid-cols-1">
          <p className="text-center text-xs leading-relaxed text-foreground-secondary">
            로그인 시{' '}
            <Link href={APP_PATH.TERMS} className="underline">
              서비스이용약관
            </Link>{' '}
            및{' '}
            <Link href={APP_PATH.PRIVACY} className="underline">
              개인정보처리방침
            </Link>
            에<br />
            동의하는 것으로 간주해요
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
