'use client';

import { useEffect } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { BackHeader } from '@/components/layout/back-header';
import { ManyakLogo } from '@/components/layout/manyak-logo';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { GoogleLogo } from '@/features/auth/_shared/components/google-logo';
import { KakaoLogo } from '@/features/auth/_shared/components/kakao-logo';
import {
  buildLoginUrl,
  resolveLoginCallbackUrl,
} from '@/features/auth/_shared/utils/login-callback-url';
import { startSocialLogin } from '@/features/auth/_shared/utils/start-social-login';
import { SESSION_EXPIRED_PARAM } from '@/lib/auth/session-expiry';
import type { SocialLoginProvider } from '@/lib/auth/social-provider';
import { track } from '@/observability/analytics';

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    void startSocialLogin({
      provider,
      redirectTo: resolveLoginCallbackUrl(searchParams.get('callbackUrl')),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader title="로그인" fallbackHref={APP_PATH.MAIN.STORIES} />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-4 pt-0">
        <div className="flex flex-col items-center gap-4">
          <ManyakLogo className="h-6 w-auto text-primary" />
          <p className="text-center text-lg font-semibold">
            로그인하고 나만의 스토리를
            <br />
            어디서든 이어서 즐겨보세요
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-4">
          <p className="text-center text-sm leading-relaxed text-foreground-secondary">
            처음 로그인하면 이 기기의 스토리와 채팅이 계정에 저장돼요
            <br />이 과정은 계정당 한 번만 진행돼요
          </p>
          <div className="flex w-full flex-col gap-3">
            <Button
              type="button"
              size="lg"
              className="w-full bg-[#FEE500] text-[#191919] hover:bg-[#FEE500]/80"
              onClick={() => handleSocialLogin('kakao')}>
              <KakaoLogo />
              카카오로 시작하기
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin('google')}>
              <GoogleLogo />
              Google로 시작하기
            </Button>
          </div>
          <p className="text-center text-xs leading-relaxed text-foreground-secondary">
            이전에 가입한 적이 있다면
            <br />
            그때 사용한 방법으로 로그인해 주세요
          </p>
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
        </div>
      </main>
    </div>
  );
}
