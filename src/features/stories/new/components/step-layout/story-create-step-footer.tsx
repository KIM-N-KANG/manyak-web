import type { ReactNode } from 'react';

type StoryCreateStepFooterProps = {
  children: ReactNode;
};

export function StoryCreateStepFooter({
  children,
}: StoryCreateStepFooterProps) {
  return (
    <nav className="shrink-0 bg-background px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="flex w-full items-center gap-2 [&>button]:flex-1">
        {children}
      </div>
    </nav>
  );
}
