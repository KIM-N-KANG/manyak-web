'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { hasInAppNavigation } from '@/components/providers/in-app-navigation-tracker';
import { Button } from '@/components/ui/button';

type BackHeaderProps = {
  title: string;
  /** 앱 안에서 이동해 온 화면이 없을 때(주소나 알림으로 바로 연 경우) 대신 열 화면 */
  fallbackHref?: string;
};

export function BackHeader({ title, fallbackHref }: BackHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (fallbackHref && !hasInAppNavigation()) {
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
