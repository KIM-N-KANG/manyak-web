import type { ReactNode } from 'react';

type StoryCreateStepFooterProps = {
  children: ReactNode;
};

export function StoryCreateStepFooter({
  children,
}: StoryCreateStepFooterProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md bg-background px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 w-full items-center gap-2 [&>button]:flex-1">
        {children}
      </div>
    </nav>
  );
}
