'use client';

import { useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { BackHeader } from '@/components/layout/back-header';
import { ManyakLogo } from '@/components/layout/manyak-logo';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { GoogleLogo } from '@/features/auth/_shared/components/google-logo';
import { KakaoLogo } from '@/features/auth/_shared/components/kakao-logo';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';
import {
  SOCIAL_LOGIN_PENDING_LABEL,
  useSocialLogin,
} from '@/features/auth/_shared/hooks/use-social-login';
import {
  buildLoginUrl,
  resolveLoginCallbackUrl,
} from '@/features/auth/_shared/utils/login-callback-url';
import { SESSION_EXPIRED_PARAM } from '@/lib/auth/session-expiry';
import type { SocialLoginProvider } from '@/lib/auth/social-provider';
import { track } from '@/observability/analytics';

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pendingProvider, startLogin } = useSocialLogin();
  const errorCode = searchParams.get('error');
  const isSessionExpired = searchParams.has(SESSION_EXPIRED_PARAM);
  const callbackUrl = searchParams.get('callbackUrl');
  const loginPathWithCallback = buildLoginUrl(callbackUrl);

  useEffect(() => {
    track('client_login_viewed');
  }, []);

  useEffect(() => {
    if (errorCode === null) {
      return;
    }

    track('client_login_oauthError_shown', {
      error_code: errorCode,
      provider: null,
    });
    toast.error(TOAST_MESSAGE.LOGIN_FAILED);
    router.replace(loginPathWithCallback);
  }, [errorCode, loginPathWithCallback, router]);

  useEffect(() => {
    if (!isSessionExpired) {
      return;
    }

    toast.warning(TOAST_MESSAGE.SESSION_EXPIRED);
    router.replace(loginPathWithCallback);
  }, [isSessionExpired, loginPathWithCallback, router]);

  const handleSocialLogin = (provider: SocialLoginProvider) => {
    track(
      provider === 'kakao'
        ? 'client_login_kakaoButton_clicked'
        : 'client_login_googleButton_clicked',
    );
    void startLogin({
      provider,
      redirectTo: resolveLoginCallbackUrl(searchParams.get('callbackUrl')),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader title="로그인" fallbackHref={APP_PATH.MAIN.STORIES} />
      <main className="flex min-h-0 flex-1 flex-col items-center p-4 pt-0">
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-4">
            <ManyakLogo className="h-6 w-auto text-primary" />
            <p className="text-center text-lg font-semibold whitespace-pre-line">
              {LOGIN_COPY.title}
            </p>
          </div>
          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex w-full flex-col gap-2">
              <Button
                type="button"
                size="lg"
                className="relative w-full bg-[#FEE500] text-[#191919] hover:bg-[#FEE500]/80"
                disabled={pendingProvider !== null}
                onClick={() => handleSocialLogin('kakao')}>
                <LoadingButtonContent
                  isLoading={pendingProvider === 'kakao'}
                  loadingLabel={SOCIAL_LOGIN_PENDING_LABEL}>
                  <KakaoLogo />
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
                  <GoogleLogo />
                  Google로 시작하기
                </LoadingButtonContent>
              </Button>
            </div>
            <p className="text-center text-sm leading-relaxed whitespace-pre-line text-foreground-secondary">
              {LOGIN_COPY.linkNotice}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
