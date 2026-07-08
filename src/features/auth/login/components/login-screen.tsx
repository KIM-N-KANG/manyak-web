'use client';

import { useEffect } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';

import { BackHeader } from '@/components/layout/back-header';
import { ManyakLogo } from '@/components/layout/manyak-logo';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { SESSION_EXPIRED_PARAM } from '@/lib/auth/session-expiry';
import { track } from '@/observability/analytics';

import { GoogleLogo } from './google-logo';

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasError = searchParams.has('error');
  const isSessionExpired = searchParams.has(SESSION_EXPIRED_PARAM);

  useEffect(() => {
    track('client_login_viewed');
  }, []);

  useEffect(() => {
    if (!hasError) {
      return;
    }

    toast.error(TOAST_MESSAGE.LOGIN_FAILED);
    router.replace(APP_PATH.LOGIN);
  }, [hasError, router]);

  useEffect(() => {
    if (!isSessionExpired) {
      return;
    }

    toast(TOAST_MESSAGE.SESSION_EXPIRED);
    router.replace(APP_PATH.LOGIN);
  }, [isSessionExpired, router]);

  const handleGoogleLogin = () => {
    track('client_login_googleButton_clicked');
    void signIn('google', { redirectTo: APP_PATH.MAIN.STORIES });
  };

  return (
    <div className="flex h-svh min-h-0 flex-col">
      <BackHeader title="로그인" backHref={APP_PATH.MAIN.MY} />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-24">
        <ManyakLogo className="h-6 w-auto text-primary" />
        <p className="text-center text-lg font-semibold">
          로그인하고 나만의 스토리를
          <br />
          어디서든 이어서 즐겨보세요
        </p>
        <p className="text-center text-xs leading-relaxed text-foreground-secondary">
          로그인하면 이 기기에서 만든 스토리·채팅이 계정으로 자동 이관돼요.
          이관은 계정당 한 번만 가능하며, 다음 로그인부터는 이 기기의
          스토리·채팅이 이관되지 않아요.
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
          에 동의하는 것으로 간주해요.
        </p>
      </main>
    </div>
  );
}
