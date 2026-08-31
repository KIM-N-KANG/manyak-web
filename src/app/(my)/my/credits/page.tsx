import { BackHeader } from '@/components/layout/back-header';
import { CreditHistoryScreen } from '@/features/my/credits/components/credit-history-screen';
import { CREDIT_HISTORY_COPY } from '@/features/my/credits/constants';

export default function MyCreditsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader title={CREDIT_HISTORY_COPY.title} />
      <CreditHistoryScreen />
    </div>
  );
}
