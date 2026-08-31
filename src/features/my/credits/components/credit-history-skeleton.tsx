import { Skeleton } from '@/components/ui/skeleton';

import { CREDIT_HISTORY_COPY } from '../constants';

const PLACEHOLDER_ROW_COUNT = 8;

/** 조회 중 목록 자리를 잡아 두는 골격. 내역 줄과 같은 구조라 목록이 도착해도 요소가 튀지 않는다. */
export function CreditHistorySkeleton() {
  return (
    <div
      className="flex flex-col"
      role="status"
      aria-label={CREDIT_HISTORY_COPY.loading}>
      {Array.from({ length: PLACEHOLDER_ROW_COUNT }, (_, index) => (
        <div key={index} className="flex items-center gap-2 py-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
