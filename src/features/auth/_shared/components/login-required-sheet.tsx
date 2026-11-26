'use client';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { GoogleLogo } from '@/features/auth/_shared/components/google-logo';
import { KakaoLogo } from '@/features/auth/_shared/components/kakao-logo';
import { LoginLegalLinks } from '@/features/auth/_shared/components/login-legal-links';
import { SignupBenefitBadge } from '@/features/auth/_shared/components/signup-benefit-badge';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';
import {
  SOCIAL_LOGIN_PENDING_LABEL,
  useSocialLogin,
} from '@/features/auth/_shared/hooks/use-social-login';
import {
  readCurrentAppPath,
  resolveLoginCallbackUrl,
} from '@/features/auth/_shared/utils/login-callback-url';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import type { SocialLoginProvider } from '@/lib/auth/social-provider';

type LoginRequiredSheetProps = {
  open: boolean;
  /** 소셜 로그인이 진행 중인 동안에는 닫힘 요청이 전달되지 않는다. */
  onOpenChange: (open: boolean) => void;
};

/**
 * 게스트가 회원 기능을 시도할 때 띄우는 소셜 로그인 시트.
 * 로그인을 마치면 시트를 연 현재 앱 경로로 돌아온다. 로그인이 진행 중인 동안에는 바깥
 * 누르기와 닫힘 요청을 막는다.
 */
export function LoginRequiredSheet({
  open,
  onOpenChange,
}: LoginRequiredSheetProps) {
  const container = useAppFrameContainer();
  const { pendingProvider, startLogin } = useSocialLogin();

  const handleSocialLogin = (provider: SocialLoginProvider) => {
    void startLogin({
      provider,
      redirectTo: resolveLoginCallbackUrl(readCurrentAppPath()),
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && pendingProvider !== null) {
      return;
    }

    onOpenChange(open);
  };

  return (
    <Drawer
      open={open && container !== null}
      disablePointerDismissal={pendingProvider !== null}
      onOpenChange={handleOpenChange}>
      <DrawerContent container={container}>
        <DrawerHeader className="gap-2 px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-xl leading-snug font-bold whitespace-pre-line">
            {LOGIN_COPY.title}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex min-h-0 w-full flex-col items-center overflow-y-auto overscroll-contain px-4 pt-8 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SignupBenefitBadge />
          <div className="mt-2 flex w-full flex-col gap-2">
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
          <div className="mt-3">
            <LoginLegalLinks />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
