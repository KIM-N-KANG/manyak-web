'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import type { ChoicesStatus as ChoicesStatusValue } from '../../hooks/use-chat-choices';

type ChatChoicesStatusProps = {
  status: ChoicesStatusValue['status'];
  onRetry: () => void;
};

export function ChatChoicesStatus({ status, onRetry }: ChatChoicesStatusProps) {
  if (status === 'loading') {
    return (
      <div
        aria-label="선택지를 만드는 중"
        className="flex flex-col items-end gap-2 p-4 pb-6">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-4/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2 p-4 pb-6">
      <p className="text-sm text-foreground-secondary">
        선택지를 만들지 못했어요
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}
