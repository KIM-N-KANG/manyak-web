'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { useMe } from '@/api/generated/endpoints/auth/auth';
import { CreditMark } from '@/components/common/credit-mark';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_PATH } from '@/constants/app-path';
import { CREDIT_CHARGE_COPY } from '@/features/my/credits/constants';
import { cn } from '@/lib/utils';

type CreditBalanceCardProps = {
  /** 바깥 섹션 클래스. 마이 화면 기본 여백을 다른 배치에 맞게 덮어쓸 때 쓴다. */
  className?: string;
};

export function CreditBalanceCard({ className }: CreditBalanceCardProps) {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const { data, isLoading } = useMe({
    query: { refetchOnMount: 'always', enabled: isAuthenticated },
  });

  const me = data?.status === 200 ? data.data : undefined;
  const balance = me?.creditBalance;

  if (status === 'loading') {
    return (
      <section className={cn('-mt-4 mb-4 p-4 pt-0', className)}>
        <Skeleton className="h-18 rounded-lg" />
      </section>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <section className={cn('-mt-4 mb-4 p-4 pt-0', className)}>
      <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm text-foreground-secondary">
            {CREDIT_CHARGE_COPY.balanceLabel}
          </span>
          {isLoading || balance === undefined ? (
            <Skeleton className="h-7 w-12 bg-foreground/5" />
          ) : (
            <span className="flex items-center gap-1 text-lg font-semibold tabular-nums">
              <CreditMark className="size-5" />
              {balance.toLocaleString()}
            </span>
          )}
        </div>
        {/* 이프를 얻는 모든 수단은 이프 충전 화면이 소유한다 — 카드에는 진입 버튼만 둔다. */}
        <Button
          nativeButton={false}
          render={<Link href={APP_PATH.MY_CREDITS} />}>
          {CREDIT_CHARGE_COPY.entryButton}
        </Button>
      </div>
    </section>
  );
}
