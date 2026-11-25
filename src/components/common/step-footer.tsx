'use client';

import type { ReactNode } from 'react';

import { useVirtualKeyboardOpen } from '@/hooks/use-virtual-keyboard-open';
import { cn } from '@/lib/utils';

type StepFooterProps = {
  /** 가로로 나란히 놓는 버튼. 직계 `button`은 같은 폭으로 늘어난다. */
  children: ReactNode;
  /** 메시지와 버튼 위에 좌우 여백 없이 놓는 영역. */
  top?: ReactNode;
  /** 버튼 바로 위에 좌우 여백을 두고 놓는 안내 문구. */
  message?: ReactNode;
};

/**
 * 단계 화면 하단의 버튼 푸터. 가상 키보드가 열리면 입력 칸을 가리지 않도록 숨긴다.
 */
export function StepFooter({ children, top, message }: StepFooterProps) {
  const isVirtualKeyboardOpen = useVirtualKeyboardOpen();

  return (
    <nav
      className={cn(
        'flex shrink-0 flex-col gap-2 bg-background pb-[calc(1rem+env(safe-area-inset-bottom))]',
        isVirtualKeyboardOpen && 'hidden',
      )}>
      {top}
      {message != null && <div className="px-4">{message}</div>}
      <div className="flex w-full items-center gap-2 px-4 [&>button]:flex-1">
        {children}
      </div>
    </nav>
  );
}
