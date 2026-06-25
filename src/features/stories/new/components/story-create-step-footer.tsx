import type { ReactNode } from 'react';

type StoryCreateStepFooterProps = {
  children: ReactNode;
};

export function StoryCreateStepFooter({
  children,
}: StoryCreateStepFooterProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto h-16 max-w-md bg-background px-4">
      <div className="flex h-full w-full items-center gap-2 [&>button]:flex-1">
        {children}
      </div>
    </nav>
  );
}
