'use client';

import { useGetMyCredits } from '@/api/generated/endpoints/credits/credits';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { useClaimAttendance } from '../hooks/use-claim-attendance';

export function CreditBalanceCard() {
  const { data, isLoading } = useGetMyCredits({
    query: { refetchOnMount: 'always' },
  });
  const { claimAttendance, isClaiming } = useClaimAttendance();

  const balance = data?.status === 200 ? (data.data.balance ?? 0) : undefined;

  return (
    <section className="-mt-4 mb-4 p-4 pt-0">
      <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-foreground-secondary">내 크레딧</span>
          {isLoading || balance === undefined ? (
            <Skeleton className="h-7 w-12 bg-foreground/5" />
          ) : (
            <span className="text-lg font-semibold tabular-nums">
              {balance.toLocaleString()}
            </span>
          )}
        </div>
        <Button
          type="button"
          disabled={isClaiming}
          onClick={() => claimAttendance()}>
          출석 체크
        </Button>
      </div>
    </section>
  );
}
