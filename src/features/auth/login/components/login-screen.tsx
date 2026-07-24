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
import {
  buildLoginUrl,
  resolveLoginCallbackUrl,
} from '@/features/auth/_shared/utils/login-callback-url';
import { startGoogleLogin } from '@/features/auth/_shared/utils/start-google-login';
import { SESSION_EXPIRED_PARAM } from '@/lib/auth/session-expiry';
import { track } from '@/observability/analytics';

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasError = searchParams.has('error');
  const isSessionExpired = searchParams.has(SESSION_EXPIRED_PARAM);
  const callbackUrl = searchParams.get('callbackUrl');
  const loginPathWithCallback = buildLoginUrl(callbackUrl);

  useEffect(() => {
    track('client_login_viewed');
  }, []);

  useEffect(() => {
    if (!hasError) {
      return;
    }

    toast.error(TOAST_MESSAGE.LOGIN_FAILED);
    router.replace(loginPathWithCallback);
  }, [hasError, loginPathWithCallback, router]);

  useEffect(() => {
    if (!isSessionExpired) {
      return;
    }

    toast.warning(TOAST_MESSAGE.SESSION_EXPIRED);
    router.replace(loginPathWithCallback);
  }, [isSessionExpired, loginPathWithCallback, router]);

  const handleGoogleLogin = () => {
    track('client_login_googleButton_clicked');
    void startGoogleLogin({
      redirectTo: resolveLoginCallbackUrl(searchParams.get('callbackUrl')),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader title="로그인" fallbackHref={APP_PATH.MAIN.STORIES} />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-4">
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
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}>
            <GoogleLogo />
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
            에<br />
            동의하는 것으로 간주해요
          </p>
        </div>
      </main>
    </div>
  );
}
