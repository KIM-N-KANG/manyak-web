import type { ReactNode } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type LoadingButtonContentProps = {
  isLoading: boolean;
  loadingLabel: string;
  children: ReactNode;
};

/**
 * 버튼 내용 위에 로딩 스피너를 겹친다. 로딩 중에도 내용을 `invisible`로 남겨 버튼 폭이 변하지 않게 한다.
 * 스피너가 `absolute`로 가운데 겹치려면 부모 버튼에 `relative`가 있어야 한다.
 */
export function LoadingButtonContent({
  isLoading,
  loadingLabel,
  children,
}: LoadingButtonContentProps) {
  return (
    <>
      <span
        aria-hidden={isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-[inherit]',
          isLoading && 'invisible',
        )}>
        {children}
      </span>
      {isLoading && <Spinner className="absolute" aria-label={loadingLabel} />}
    </>
  );
}
