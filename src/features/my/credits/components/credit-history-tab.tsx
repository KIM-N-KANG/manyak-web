'use client';

import { useState } from 'react';

import { PullToRefresh } from '@/components/motion/pull-to-refresh';
import { CreditHistoryList } from '@/features/my/_shared/components/credit-history-list';
import { useRefreshActiveQueries } from '@/hooks/use-refresh-active-queries';

type CreditHistoryTabProps = {
  /** 회원 판정이 끝나기 전에는 조회하지 않기 위한 활성화 플래그 */
  enabled: boolean;
};

export function CreditHistoryTab({ enabled }: CreditHistoryTabProps) {
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const refreshActiveQueries = useRefreshActiveQueries();

  return (
    <PullToRefresh
      ref={setScrollElement}
      onRefresh={refreshActiveQueries}
      className="h-full scroll-fade-b"
      contentClassName="flex flex-col px-4 py-2">
      <CreditHistoryList enabled={enabled} scrollElement={scrollElement} />
    </PullToRefresh>
  );
}
