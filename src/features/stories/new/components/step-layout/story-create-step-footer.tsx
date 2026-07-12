import type { ReactNode } from 'react';

type StoryCreateStepFooterProps = {
  children: ReactNode;
  message?: ReactNode;
};

export function StoryCreateStepFooter({
  children,
  message,
}: StoryCreateStepFooterProps) {
  return (
    <nav className="flex shrink-0 flex-col gap-2 bg-background px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {message}
      <div className="flex w-full items-center gap-2 [&>button]:flex-1">
        {children}
      </div>
    </nav>
  );
}
