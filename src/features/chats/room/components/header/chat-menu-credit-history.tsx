import { useState } from 'react';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { CreditHistoryList } from '@/features/my/_shared/components/credit-history-list';
import { useRefreshCreditTransactions } from '@/features/my/_shared/hooks/use-credit-transactions';

import { CHAT_MENU_COPY } from '../../constants';

type ChatMenuCreditHistoryProps = {
  onBack: () => void;
};

export function ChatMenuCreditHistory({ onBack }: ChatMenuCreditHistoryProps) {
  const { isMember } = useMemberAccess();
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const { refresh, isRefreshing } = useRefreshCreditTransactions();

  const handleRefresh = () => {
    scrollElement?.scrollTo({ top: 0 });
    void refresh();
  };

  return (
    <div className="flex h-[70dvh] animate-in flex-col duration-300 fade-in-0 slide-in-from-right-6">
      <DrawerHeader className="flex-row items-center gap-1 px-2 pt-3 pb-1 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={CHAT_MENU_COPY.creditHistory.back}
          onClick={onBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
        </Button>
        <DrawerTitle className="flex-1 text-xl leading-snug font-bold">
          {CHAT_MENU_COPY.creditHistory.title}
        </DrawerTitle>
        <Button
          type="button"
          variant="ghost"
          className="relative text-foreground-secondary"
          disabled={!isMember || isRefreshing}
          onClick={handleRefresh}>
          <LoadingButtonContent
            isLoading={isRefreshing}
            loadingLabel={CHAT_MENU_COPY.creditHistory.refreshing}>
            {CHAT_MENU_COPY.creditHistory.refresh}
          </LoadingButtonContent>
        </Button>
      </DrawerHeader>
      <div
        ref={setScrollElement}
        className="min-h-0 flex-1 scroll-fade-b overflow-y-auto overscroll-contain">
        <div className="flex flex-col px-4 pt-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <CreditHistoryList enabled={isMember} scrollElement={scrollElement} />
        </div>
      </div>
    </div>
  );
}
