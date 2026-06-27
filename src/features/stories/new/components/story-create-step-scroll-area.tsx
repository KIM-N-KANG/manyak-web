import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type StoryCreateStepScrollAreaProps = ComponentProps<'main'>;

export function StoryCreateStepScrollArea({
  className,
  ...props
}: StoryCreateStepScrollAreaProps) {
  return (
    <main
      className={cn(
        'flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))]',
        className,
      )}
      {...props}
    />
  );
}
