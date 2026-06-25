import type { ComponentProps, ReactNode } from 'react';

import { TabsList } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type StickyTabsListProps = ComponentProps<typeof TabsList> & {
  rightSlot?: ReactNode;
};

export function StickyTabsList({
  children,
  rightSlot,
  ...props
}: StickyTabsListProps) {
  return (
    <div
      className={cn(
        'sticky -top-px z-10 mt-2 bg-background px-4 py-2',
        rightSlot && 'flex items-center justify-between gap-2',
      )}>
      <TabsList {...props}>{children}</TabsList>
      {rightSlot}
    </div>
  );
}
