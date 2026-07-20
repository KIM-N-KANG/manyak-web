'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m } from 'motion/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

type BackHeaderProps = {
  title: string;
  backHref?: string;
  fallbackHref?: string;
  /**
   * 헤더 제목의 노출 여부. 생략하면 항상 제목을 보여준다.
   * 본문 상단에 같은 제목(h1)이 있어 스크롤에 따라 헤더 제목을 드러내는
   * 화면만 이 값을 넘기며, 이때 헤더 제목은 본문 제목과 중복되므로
   * 보조 기술에서 제외한다.
   */
  showTitle?: boolean;
};

export function BackHeader({
  title,
  backHref,
  fallbackHref,
  showTitle,
}: BackHeaderProps) {
  const router = useRouter();

  const isTitleControlled = showTitle !== undefined;
  const isTitleVisible = showTitle ?? true;

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
      <m.span
        aria-hidden={isTitleControlled || undefined}
        initial={false}
        animate={{
          opacity: isTitleVisible ? 1 : 0,
          y: isTitleVisible ? 0 : 4,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="min-w-0 flex-1 truncate font-semibold">
        {title}
      </m.span>
    </header>
  );
}
