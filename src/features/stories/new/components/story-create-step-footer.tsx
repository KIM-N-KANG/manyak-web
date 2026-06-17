import type { ReactNode } from 'react';

type StoryCreateStepFooterProps = {
  progressLabel?: string;
  children: ReactNode;
};

export function StoryCreateStepFooter({
  progressLabel,
  children,
}: StoryCreateStepFooterProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto h-16 max-w-md border-t border-border bg-background px-4">
      {progressLabel ? (
        <div className="flex h-full w-full items-center justify-between gap-4">
          <p className="text-sm font-medium">{progressLabel}</p>
          <div className="flex min-w-0 flex-1 justify-end gap-2">
            {children}
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full items-center gap-2">{children}</div>
      )}
    </nav>
  );
}
