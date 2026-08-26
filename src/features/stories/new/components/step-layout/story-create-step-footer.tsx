import type { ReactNode } from 'react';

type StoryCreateStepFooterProps = {
  children: ReactNode;
  top?: ReactNode;
  message?: ReactNode;
};

export function StoryCreateStepFooter({
  children,
  top,
  message,
}: StoryCreateStepFooterProps) {
  return (
    <nav className="flex shrink-0 flex-col gap-2 bg-background pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {top}
      {message != null && <div className="px-4">{message}</div>}
      <div className="flex w-full items-center gap-2 px-4 [&>button]:flex-1">
        {children}
      </div>
    </nav>
  );
}
