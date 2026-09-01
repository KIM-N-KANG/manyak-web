import { BackHeader } from '@/components/layout/back-header';
import { CreditChargeScreen } from '@/features/my/credits/components/credit-charge-screen';
import { CREDIT_CHARGE_COPY } from '@/features/my/credits/constants';

export default function MyCreditsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader title={CREDIT_CHARGE_COPY.title} />
      <CreditChargeScreen />
    </div>
  );
}
