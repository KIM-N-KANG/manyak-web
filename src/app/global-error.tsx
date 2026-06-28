'use client';

import './globals.css';

import { useEffect, useState } from 'react';

import * as Sentry from '@sentry/nextjs';

import { maruburi, pretendard } from '@/assets/fonts/fonts';
import { RetryListStatus } from '@/components/common/retry-list-status';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function resolveIsDark() {
  if (typeof window === 'undefined') return false;

  const stored = window.localStorage.getItem('theme');

  if (stored === 'dark') return true;

  if (stored === 'light') return false;

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [isDark] = useState(resolveIsDark);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${maruburi.variable} antialiased ${isDark ? 'dark' : ''}`}
      suppressHydrationWarning>
      <body className="bg-border font-sans text-foreground">
        <div className="mx-auto flex h-svh min-h-0 w-full max-w-md flex-col overflow-hidden bg-background">
          <RetryListStatus title="문제가 발생했어요" onRetry={() => reset()} />
        </div>
      </body>
    </html>
  );
}
