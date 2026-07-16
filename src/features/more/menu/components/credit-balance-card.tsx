'use client';

import { useSession } from 'next-auth/react';

import { useMe } from '@/api/generated/endpoints/auth/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useClaimAttendance } from '@/features/more/_shared/hooks/use-claim-attendance';
import { track } from '@/observability/analytics';

export function CreditBalanceCard() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const { data, isLoading } = useMe({
    query: { refetchOnMount: 'always', enabled: isAuthenticated },
  });
  const { claimAttendance, isClaiming } = useClaimAttendance();

  const me = data?.status === 200 ? data.data : undefined;
  const balance = me?.creditBalance ?? undefined;
  const attendedToday = me?.attendedToday ?? false;
  const isMeReady = me !== undefined;

  if (status === 'loading') {
    return (
      <section className="-mt-4 mb-4 p-4 pt-0">
        <Skeleton className="h-18 rounded-lg" />
      </section>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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
          className="relative"
          disabled={!isMeReady || attendedToday || isClaiming}
          onClick={() => {
            track('client_account_attendanceButton_clicked');
            claimAttendance();
          }}>
          <span className={isClaiming ? 'invisible' : undefined}>
            {attendedToday ? '출석 완료' : '출석 체크'}
          </span>
          {isClaiming && (
            <Spinner className="absolute" aria-label="출석 체크 중" />
          )}
        </Button>
      </div>
    </section>
  );
}
