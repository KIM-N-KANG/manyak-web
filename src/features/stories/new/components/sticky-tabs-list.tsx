import type { ReactNode } from 'react';

import { TabsList } from '@/components/ui/tabs';

type StickyTabsListProps = {
  children: ReactNode;
};

export function StickyTabsList({ children }: StickyTabsListProps) {
  return (
    <div className="sticky -top-px z-10 mt-2 bg-background px-4 pt-2.25 pb-2">
      <TabsList>{children}</TabsList>
    </div>
  );
}
