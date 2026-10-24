'use client';

import { useEffect, useRef } from 'react';

import Image from 'next/image';

import { LogoHeader } from '@/components/layout/logo-header';
import { buttonVariants } from '@/components/ui/button';
import {
  APP_SHARE_PLAY_STORE_URL,
  startAppShareRedirect,
} from '@/lib/app-share';
import { cn } from '@/lib/utils';

import { APP_SHARE_COPY } from '../constants';

export function AppShareScreen() {
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // 자동 이동은 첫 마운트에 한 번만 실행한다. 폴백은 떠나지 않은 사용자를 위한 것이라
    // 정리 함수에서 취소하지 않고, bfcache로 복원된 문서에서만 남은 폴백을 취소한다.
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const cancelFallback = startAppShareRedirect(navigator.userAgent);

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        cancelFallback?.();
      }
    }

    window.addEventListener('pageshow', handlePageShow);

    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <LogoHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={80}
          height={80}
          unoptimized
          className="size-20 rounded-[20px]"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">{APP_SHARE_COPY.heading}</h1>
          <p className="text-sm text-foreground-secondary">
            {APP_SHARE_COPY.description}
          </p>
        </div>
        <a
          href={APP_SHARE_PLAY_STORE_URL}
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
          {APP_SHARE_COPY.action}
        </a>
      </main>
    </div>
  );
}
