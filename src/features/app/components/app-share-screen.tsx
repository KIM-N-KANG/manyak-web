'use client';

import { useEffect, useRef } from 'react';

import {
  AiImageIcon,
  AiMagicIcon,
  BubbleChatIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import Image from 'next/image';
import Link from 'next/link';

import { LogoHeader } from '@/components/layout/logo-header';
import { buttonVariants } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import {
  APP_SHARE_PLAY_STORE_URL,
  startAppShareRedirect,
} from '@/lib/app-share';
import { cn } from '@/lib/utils';

import { APP_SHARE_COPY } from '../constants';

/** 소개 항목 순서대로 붙는 아이콘이다. */
const FEATURE_ICONS: readonly IconSvgElement[] = [
  AiMagicIcon,
  BubbleChatIcon,
  AiImageIcon,
];

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
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5">
        <section className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={72}
            height={72}
            unoptimized
            className="size-18 rounded-[18px] ring-1 ring-border"
          />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-balance">
              {APP_SHARE_COPY.heading}
            </h1>
            <p className="text-foreground-secondary">
              {APP_SHARE_COPY.description}
            </p>
          </div>
        </section>
        <ul className="mb-4 flex shrink-0 flex-col gap-1 rounded-xl bg-muted p-2">
          {APP_SHARE_COPY.features.map((feature, index) => (
            <li key={feature} className="flex items-center gap-3 px-2 py-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <HugeiconsIcon
                  icon={FEATURE_ICONS[index]}
                  className="size-5"
                  aria-hidden="true"
                />
              </span>
              <span className="text-sm font-medium">{feature}</span>
            </li>
          ))}
        </ul>
      </main>
      <footer className="flex shrink-0 flex-col gap-1 px-5 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <a
          href={APP_SHARE_PLAY_STORE_URL}
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
          {APP_SHARE_COPY.action}
        </a>
        <Link
          href={APP_PATH.MAIN.STORIES}
          replace
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'lg' }),
            'w-full text-foreground-secondary',
          )}>
          {APP_SHARE_COPY.browseWeb}
        </Link>
      </footer>
    </div>
  );
}
