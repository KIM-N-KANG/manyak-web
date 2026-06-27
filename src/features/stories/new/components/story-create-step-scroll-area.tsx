import type { ComponentProps, Ref } from 'react';

import { cn } from '@/lib/utils';

type StoryCreateStepScrollAreaProps = ComponentProps<'main'> & {
  scrollAreaRef?: Ref<HTMLElement>;
};

export function StoryCreateStepScrollArea({
  className,
  scrollAreaRef,
  ...props
}: StoryCreateStepScrollAreaProps) {
  return (
    <main
      ref={scrollAreaRef}
      className={cn(
        'flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))]',
        className,
      )}
      {...props}
    />
  );
}
