import { BackHeader } from '@/components/layout/back-header';
import { APP_PATH } from '@/constants/app-path';
import { CreditChargeScreen } from '@/features/my/credits/components/credit-charge-screen';
import { CREDIT_CHARGE_COPY } from '@/features/my/credits/constants';

export default function MyCreditsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 결제 복귀 되감기 뒤에는 다른 문서의 기록으로 돌아가야 하므로 아래 기록이 전혀 없을 때만 마이 탭으로 바꾼다. */}
      <BackHeader
        title={CREDIT_CHARGE_COPY.title}
        fallbackHref={APP_PATH.MAIN.MY}
        fallbackWhen="no-history"
      />
      <CreditChargeScreen />
    </div>
  );
}
