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

/**
 * 저장된 테마 설정과 시스템 선호도로 다크 모드 여부를 판별한다.
 *
 * @returns 다크 모드이면 true
 */
function resolveIsDark() {
  if (typeof window === 'undefined') return false;

  const stored = window.localStorage.getItem('theme');

  if (stored === 'dark') return true;

  if (stored === 'light') return false;

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * 루트 레이아웃까지 실패했을 때 그 자리를 대신하는 오류 화면.
 *
 * @remarks
 * 루트 레이아웃을 대체하므로 html과 body를 직접 그리고, 앱 프레임 크기도 스스로 잡는다.
 * `ThemeProvider`가 없어 저장된 테마를 첫 렌더에서 직접 읽어 `dark` 클래스를 붙인다.
 */
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
      <body className="font-sans text-foreground">
        <div className="mx-auto flex h-dvh min-h-0 w-full max-w-md flex-col overflow-hidden bg-background">
          <RetryListStatus title="문제가 발생했어요" onRetry={() => reset()} />
        </div>
      </body>
    </html>
  );
}
