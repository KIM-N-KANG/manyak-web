'use client';

import { useMe } from '@/api/generated/endpoints/auth/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

import { useClaimAttendance } from '../hooks/use-claim-attendance';

export function CreditBalanceCard() {
  const { data, isLoading } = useMe({
    query: { refetchOnMount: 'always' },
  });
  const { claimAttendance, isClaiming } = useClaimAttendance();

  const me = data?.status === 200 ? data.data : undefined;
  const balance = me?.creditBalance ?? undefined;
  const attendedToday = me?.attendedToday ?? false;

  // me가 아직 없으면 출석 여부를 알 수 없어 버튼을 비활성으로 둔다(깜빡임 방지).
  const isMeReady = me !== undefined;

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
          onClick={() => claimAttendance()}>
          {/* 클레임 중엔 라벨을 숨겨 폭을 유지한 채 스피너만 겹쳐 보여준다. */}
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
