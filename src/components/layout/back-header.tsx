'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import {
  hasHistoryBelow,
  hasInAppNavigation,
} from '@/components/providers/in-app-navigation-tracker';
import { Button } from '@/components/ui/button';

type BackHeaderProps = {
  title: string;
  /** 앱 안에서 이동해 온 화면이 없을 때(주소나 알림으로 바로 연 경우) 대신 열 화면 */
  fallbackHref?: string;
  /**
   * 대체 경로를 쓰는 조건. 기본 `direct-entry`는 아래에 같은 문서의 앱 화면이 없으면 대체한다.
   * `no-history`는 아래에 기록이 전혀 없을 때만 대체해, 결제 복귀 되감기처럼 다른 문서의 기록으로 돌아가야 하는
   * 화면에서 뒤로가기를 살린다.
   */
  fallbackWhen?: 'direct-entry' | 'no-history';
};

export function BackHeader({
  title,
  fallbackHref,
  fallbackWhen = 'direct-entry',
}: BackHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    const shouldFallback =
      fallbackWhen === 'no-history'
        ? !hasHistoryBelow()
        : !hasInAppNavigation();

    if (fallbackHref && shouldFallback) {
      router.replace(fallbackHref);

      return;
    }

    router.back();
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-2">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="이전 페이지로 돌아가기 버튼"
        onClick={handleBack}>
        <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
      </Button>
      <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
    </header>
  );
}
