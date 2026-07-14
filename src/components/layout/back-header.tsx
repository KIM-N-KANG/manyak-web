'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

type BackHeaderProps = {
  title: string;
  backHref?: string;
  fallbackHref?: string;
};

export function BackHeader({ title, backHref, fallbackHref }: BackHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.replace(backHref);

      return;
    }

    if (fallbackHref && window.history.length <= 2) {
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
