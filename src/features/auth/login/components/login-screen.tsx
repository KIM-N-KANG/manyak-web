'use client';

import { useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';

import { BackHeader } from '@/components/layout/back-header';
import { ManyakLogo } from '@/components/layout/manyak-logo';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
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

    toast.error('로그인에 실패했어요. 다시 시도해 주세요.');
    router.replace(APP_PATH.LOGIN);
  }, [hasError, router]);

  useEffect(() => {
    if (!isSessionExpired) {
      return;
    }

    // 능동 로그아웃으로 이동해 온 경우 안내 후 파라미터를 지워 새로고침 시 재노출을 막는다.
    toast('세션이 만료되어 로그아웃되었습니다. 다시 로그인해 주세요.');
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
          로그인하고 내 이야기를
          <br />
          어디서든 이어서 즐겨보세요
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
      </main>
    </div>
  );
}
