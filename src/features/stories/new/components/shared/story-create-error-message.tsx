import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type StoryCreateErrorMessageProps = {
  children: ReactNode;
  className?: string;
};

export function StoryCreateErrorMessage({
  children,
  className,
}: StoryCreateErrorMessageProps) {
  return (
    <p className={cn('text-sm text-destructive', className)}>{children}</p>
  );
}
