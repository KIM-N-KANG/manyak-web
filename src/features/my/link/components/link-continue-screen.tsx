'use client';

import { useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { Spinner } from '@/components/ui/spinner';
import { APP_PATH } from '@/constants/app-path';
import { readLinkResultCookie } from '@/features/my/_shared/utils/link-result-cookie';
import { toLinkProviderId } from '@/lib/auth/link-account';
import { isSocialLoginProvider } from '@/lib/auth/social-provider';

/**
 * 계정 연동의 중계 화면. 현재 계정 재인증에서 돌아오면 `target` 쿼리의 계정 인증을 이어서 시작한다.
 *
 * @remarks
 * `target`이 지원하는 소셜 공급자가 아니거나, 연동 결과 쿠키가 이미 있으면(앞 단계가 결과와
 * 함께 끝났으면) 대상 인증을 시작하지 않고 마이 화면으로 replace해 결과 안내를 맡긴다.
 *
 * @see startAccountLink
 */
export function LinkContinueScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const target = searchParams.get('target');

  useEffect(() => {
    const hasFinishedWithResult = readLinkResultCookie() !== null;

    if (!isSocialLoginProvider(target) || hasFinishedWithResult) {
      router.replace(APP_PATH.MAIN.MY);

      return;
    }

    void signIn(toLinkProviderId(target), { redirectTo: APP_PATH.MAIN.MY });
  }, [router, target]);

  return (
    <main className="flex h-full items-center justify-center">
      <Spinner className="size-6 text-foreground-secondary" />
    </main>
  );
}
