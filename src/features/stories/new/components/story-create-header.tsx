import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';

export function StroyCreateHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center bg-background pr-4 pl-1">
      <div className="flex items-center gap-1">
        <Button
          nativeButton={false}
          render={<Link href={APP_PATH.MAIN.STORIES} />}
          size="icon-lg"
          variant="ghost"
          aria-label="스토리 목록 페이지 이동 버튼">
          <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
        </Button>
        <h1 className="text-lg font-semibold">스토리 만들기</h1>
      </div>
    </header>
  );
}
