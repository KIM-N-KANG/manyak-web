'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { useMe } from '@/api/generated/endpoints/auth/auth';
import { CreditMark } from '@/components/common/credit-mark';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APP_PATH } from '@/constants/app-path';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';

import { CREDIT_CHARGE_COPY } from '../constants';
import {
  CREDIT_CHARGE_TAB,
  type CreditChargeTab,
} from '../utils/credit-charge-tab';
import { CreditFreeChargeTab } from './credit-free-charge-tab';
import { CreditHistoryTab } from './credit-history-tab';
import { CreditOrderStatusCard } from './credit-order-status-card';
import { CreditPurchaseTab } from './credit-purchase-tab';

/** 탭 패널이 스크롤러라 기본 text-sm이 마이 메뉴·내역 줄의 본문 크기를 줄인다. 되돌려 둔다. */
const TAB_PANEL_CLASS = 'min-h-0 flex-1 overflow-hidden text-base';

type CreditChargeScreenProps = {
  /** 처음 열 탭. 페이지가 `?tab=` 쿼리로 정한다. */
  initialTab: CreditChargeTab;
};

/**
 * 이프 충전. 잔액 상자와 탭 줄은 셸에 고정하고 탭 패널만 스크롤한다.
 * 잔액은 어느 탭에서 무엇을 하든 계속 보여야 하는 값이다.
 *
 * 탭 전환은 URL에 남기지 않고 화면 상태로만 둔다. 알림 딥링크가 실어 오는 `?tab=` 쿼리는 처음 탭을 정하는 데만 쓴다.
 */
export function CreditChargeScreen({ initialTab }: CreditChargeScreenProps) {
  const router = useRouter();
  const { status } = useSession();
  const { isMember } = useMemberAccess();
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const isAuthenticated = status === 'authenticated';

  const { data } = useMe({
    query: { refetchOnMount: 'always', enabled: isMember },
  });
  const me = data?.status === 200 ? data.data : undefined;
  const balance = me?.creditBalance;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(APP_PATH.LOGIN);
    }
  }, [status, router]);

  // 읽은 탭 쿼리는 주소에서 지운다. 남겨 두면 다른 탭에서 결제하고 돌아왔을 때 결제 전 칸으로 되감긴 주소가
  // 쿼리 탭을 다시 연다. UTM 같은 다른 쿼리는 그대로 둔다.
  useEffect(() => {
    const url = new URL(window.location.href);

    if (!url.searchParams.has('tab')) return;

    url.searchParams.delete('tab');
    window.history.replaceState(null, '', url);
  }, []);

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
          <span className="flex items-center gap-1 self-end text-2xl font-bold tabular-nums">
            <CreditMark className="size-6" />
            {balance.toLocaleString()}
          </span>
        )}
      </section>

      {isAuthenticated && <CreditOrderStatusCard />}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-4 flex min-h-0 flex-1 flex-col gap-0">
        <TabsList variant="line" className="w-full gap-0 border-b p-0">
          <TabsTrigger
            value={CREDIT_CHARGE_TAB.PURCHASE}
            className="h-full rounded-none border-0 px-2 py-0 after:-bottom-px!">
            {CREDIT_CHARGE_COPY.purchaseTab}
          </TabsTrigger>
          <TabsTrigger
            value={CREDIT_CHARGE_TAB.FREE_CHARGE}
            className="h-full rounded-none border-0 px-2 py-0 after:-bottom-px!">
            {CREDIT_CHARGE_COPY.freeChargeTab}
          </TabsTrigger>
          <TabsTrigger
            value={CREDIT_CHARGE_TAB.HISTORY}
            className="h-full rounded-none border-0 px-2 py-0 after:-bottom-px!">
            {CREDIT_CHARGE_COPY.historyTab}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value={CREDIT_CHARGE_TAB.PURCHASE}
          className={TAB_PANEL_CLASS}>
          <CreditPurchaseTab />
        </TabsContent>

        <TabsContent
          value={CREDIT_CHARGE_TAB.FREE_CHARGE}
          className={TAB_PANEL_CLASS}>
          <CreditFreeChargeTab
            attendedToday={me?.attendedToday ?? false}
            isMeReady={me !== undefined}
          />
        </TabsContent>

        <TabsContent
          value={CREDIT_CHARGE_TAB.HISTORY}
          className={TAB_PANEL_CLASS}>
          <CreditHistoryTab enabled={isAuthenticated} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
