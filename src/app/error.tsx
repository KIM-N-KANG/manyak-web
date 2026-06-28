'use client';

import { useEffect } from 'react';

import { RetryListStatus } from '@/components/common/retry-list-status';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <RetryListStatus title="문제가 발생했어요" onRetry={() => reset()} />;
}
