'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

export function StoryCreateHeader() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center bg-background pr-4 pl-1">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon-lg"
          variant="ghost"
          aria-label="이전 페이지로 돌아가기 버튼"
          onClick={() => router.back()}>
          <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
        </Button>
        <h1 className="text-lg font-semibold">스토리 만들기</h1>
      </div>
    </header>
  );
}
