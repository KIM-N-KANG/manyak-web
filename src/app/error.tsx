'use client';

import { useEffect } from 'react';

import { ListStatus } from '@/components/common/list-status';
import { Button } from '@/components/ui/button';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ListStatus
      title="문제가 발생했어요"
      description="잠시 후 다시 시도해주세요">
      <Button variant="outline" size="lg" onClick={() => reset()}>
        다시 시도
      </Button>
    </ListStatus>
  );
}
