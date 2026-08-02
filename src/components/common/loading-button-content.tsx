import type { ReactNode } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type LoadingButtonContentProps = {
  isLoading: boolean;
  loadingLabel: string;
  children: ReactNode;
};

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
