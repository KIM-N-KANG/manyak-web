'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { useMe } from '@/api/generated/endpoints/auth/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APP_PATH } from '@/constants/app-path';

import { CREDIT_CHARGE_COPY } from '../constants';
import { CreditFreeChargeTab } from './credit-free-charge-tab';
import { CreditHistoryTab } from './credit-history-tab';

const FREE_CHARGE_TAB = 'FREE_CHARGE';
const HISTORY_TAB = 'HISTORY';

/** 탭 패널이 스크롤러라 기본 text-sm이 마이 메뉴·내역 줄의 본문 크기를 줄인다. 되돌려 둔다. */
const TAB_PANEL_CLASS = 'min-h-0 flex-1 overflow-hidden text-base';

/**
 * 이프 충전. 잔액 상자와 탭 줄은 셸에 고정하고 탭 패널만 스크롤한다 —
 * 잔액은 어느 탭에서 무엇을 하든 계속 보여야 하는 값이다.
 *
 * 탭은 URL에 남기지 않고 화면 상태로만 둔다 — 진입 경로는 마이의 "충전" 하나뿐이고
 * 탭 자체를 공유·북마크할 일이 없다.
 */
export function CreditChargeScreen() {
  const router = useRouter();
  const { status } = useSession();
  const [activeTab, setActiveTab] = useState<string>(FREE_CHARGE_TAB);

  const isAuthenticated = status === 'authenticated';

  const { data } = useMe({
    query: { refetchOnMount: 'always', enabled: isAuthenticated },
  });
  const me = data?.status === 200 ? data.data : undefined;
  const balance = me?.creditBalance;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(APP_PATH.LOGIN);
    }
  }, [status, router]);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <section
        className="mx-4 flex flex-col gap-1 rounded-lg bg-muted p-4"
        aria-label={CREDIT_CHARGE_COPY.balanceLabel}>
        <span className="font-medium text-foreground-secondary">
          {CREDIT_CHARGE_COPY.balanceLabel}
        </span>
        {balance === undefined ? (
          <Skeleton className="h-8 w-24 self-end bg-foreground/5" />
        ) : (
          <span className="self-end text-2xl font-bold tabular-nums">
            {balance.toLocaleString()}
          </span>
        )}
      </section>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-4 flex min-h-0 flex-1 flex-col gap-0">
        <TabsList variant="line" className="w-full gap-0 border-b p-0">
          <TabsTrigger
            value={FREE_CHARGE_TAB}
            className="h-full rounded-none border-0 px-2 py-0 after:-bottom-px!">
            {CREDIT_CHARGE_COPY.freeChargeTab}
          </TabsTrigger>
          <TabsTrigger
            value={HISTORY_TAB}
            className="h-full rounded-none border-0 px-2 py-0 after:-bottom-px!">
            {CREDIT_CHARGE_COPY.historyTab}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={FREE_CHARGE_TAB} className={TAB_PANEL_CLASS}>
          <CreditFreeChargeTab
            attendedToday={me?.attendedToday ?? false}
            isMeReady={me !== undefined}
          />
        </TabsContent>

        <TabsContent value={HISTORY_TAB} className={TAB_PANEL_CLASS}>
          <CreditHistoryTab enabled={isAuthenticated} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
