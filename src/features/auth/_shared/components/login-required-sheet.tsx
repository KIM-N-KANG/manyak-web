'use client';

import { useEffect } from 'react';

import { usePathname } from 'next/navigation';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { GoogleLogo } from '@/features/auth/_shared/components/google-logo';
import { KakaoLogo } from '@/features/auth/_shared/components/kakao-logo';
import { LoginConsentNotice } from '@/features/auth/_shared/components/login-consent-notice';
import { GUEST_LIMIT_SHEET_COPY } from '@/features/auth/_shared/constants/guest-limit';
import { LOGIN_REQUIRED_SHEET_COPY } from '@/features/auth/_shared/constants/login-required';
import {
  SOCIAL_LOGIN_PENDING_LABEL,
  useSocialLogin,
} from '@/features/auth/_shared/hooks/use-social-login';
import { resolveLoginCallbackUrl } from '@/features/auth/_shared/utils/login-callback-url';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import type { SocialLoginProvider } from '@/lib/auth/social-provider';
import { type GuestLimitTrigger, track } from '@/observability/analytics';

type LoginRequiredSheetProps = {
  trigger?: GuestLimitTrigger | null;
  open?: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LoginRequiredSheet({
  trigger = null,
  open = trigger !== null,
  onOpenChange,
}: LoginRequiredSheetProps) {
  const pathname = usePathname();
  const container = useAppFrameContainer();
  const { pendingProvider, startLogin } = useSocialLogin();
  const copy = trigger ? GUEST_LIMIT_SHEET_COPY : LOGIN_REQUIRED_SHEET_COPY;

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
    <Drawer
      open={open && container !== null}
      dismissible={pendingProvider === null}
      onOpenChange={handleOpenChange}>
      <DrawerContent
        container={container}
        className="absolute overflow-y-auto overscroll-contain"
        overlayClassName="absolute">
        <DrawerHeader className="gap-2 px-4 pt-4 pb-0 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <DrawerTitle className="text-xl leading-snug font-bold whitespace-nowrap">
            {copy.title}
          </DrawerTitle>
          <DrawerDescription className="text-base leading-relaxed">
            {copy.description}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex w-full flex-col gap-4 px-4 pt-8 pb-4">
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="lg"
              className="relative w-full bg-[#FEE500] text-[#191919] hover:bg-[#FEE500]/80"
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
              size="lg"
              variant="outline"
              className="relative w-full"
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
          <LoginConsentNotice />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
