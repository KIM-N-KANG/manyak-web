'use client';

import { useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { Spinner } from '@/components/ui/spinner';
import { APP_PATH } from '@/constants/app-path';
import { readLinkResultCookie } from '@/features/my/_shared/utils/link-result-cookie';
import { toLinkProviderId } from '@/lib/auth/link-account';
import { isSocialLoginProvider } from '@/lib/auth/social-provider';

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
