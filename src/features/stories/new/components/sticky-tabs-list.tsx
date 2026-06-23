import type { ComponentProps } from 'react';

import { TabsList } from '@/components/ui/tabs';

export function StickyTabsList({
  children,
  ...props
}: ComponentProps<typeof TabsList>) {
  return (
    <div className="sticky -top-px z-10 mt-2 bg-background px-4 pt-2.25 pb-2">
      <TabsList {...props}>{children}</TabsList>
    </div>
  );
}
