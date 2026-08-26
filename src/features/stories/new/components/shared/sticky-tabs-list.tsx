import type { ComponentProps } from 'react';

import { TabsList } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type StickyTabsListProps = ComponentProps<typeof TabsList> & {
  containerClassName?: string;
};

export function StickyTabsList({
  children,
  containerClassName,
  ...props
}: StickyTabsListProps) {
  return (
    <div
      className={cn(
        'sticky -top-px z-10 mt-2 bg-background px-4 py-2',
        containerClassName,
      )}>
      <TabsList {...props}>{children}</TabsList>
    </div>
  );
}
