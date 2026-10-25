'use client';

import { useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { getMeQueryKey, useMe } from '@/api/generated/endpoints/auth/auth';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { type CreditShortageTrigger, track } from '@/observability/analytics';

import { CREDIT_SHORTAGE_COPY } from '../constants/credit-shortage';
import { useClaimAttendance } from '../hooks/use-claim-attendance';

type CreditShortageSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 이프 부족이 난 유료 동작. 노출과 버튼 이벤트에 싣는다. */
  trigger: CreditShortageTrigger;
  /** 충전 버튼. 화면이 입력을 보관한 뒤 이프 충전으로 떠난다. 떠나지 못하면 시트에 머문다. */
  onCharge: () => void | Promise<void>;
};

export function CreditShortageSheet({
  open,
  onOpenChange,
  trigger,
  onCharge,
}: CreditShortageSheetProps) {
  const container = useAppFrameContainer();
  const queryClient = useQueryClient();
  const { isMember } = useMemberAccess();
  const { data } = useMe({ query: { enabled: isMember } });
  const me = data?.status === 200 ? data.data : undefined;
  const [isCharging, setIsCharging] = useState(false);
  const { claimAttendance, isClaiming } = useClaimAttendance({
    onClaimed: () => onOpenChange(false),
  });
  const isBusy = isCharging || isClaiming;

  useEffect(() => {
    if (!open) return;

    track('client_creditShortageDialog_shown', { trigger });
    void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
  }, [open, trigger, queryClient]);

  const handleCharge = async () => {
    track('client_creditShortageDialog_chargeButton_clicked', { trigger });
    setIsCharging(true);

    try {
      await onCharge();
    } finally {
      setIsCharging(false);
    }
  };

  const handleAttendance = () => {
    track('client_creditShortageDialog_attendanceButton_clicked', { trigger });
    claimAttendance();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && isBusy) return;

    onOpenChange(next);
  };

  return (
    <Drawer
      open={open && container !== null}
      disablePointerDismissal={isBusy}
      onOpenChange={handleOpenChange}>
      <DrawerContent container={container} aria-busy={isBusy}>
        <DrawerHeader className="gap-2 px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-xl leading-snug font-bold">
            {CREDIT_SHORTAGE_COPY.title}
          </DrawerTitle>
          <DrawerDescription className="text-base leading-6 text-foreground-secondary">
            {CREDIT_SHORTAGE_COPY.description}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-2 px-4 pt-8 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            size="lg"
            className="relative w-full"
            disabled={isBusy}
            onClick={() => void handleCharge()}>
            <LoadingButtonContent
              isLoading={isCharging}
              loadingLabel={CREDIT_SHORTAGE_COPY.charge}>
              {CREDIT_SHORTAGE_COPY.charge}
            </LoadingButtonContent>
          </Button>
          {me !== undefined && !me.attendedToday && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="relative w-full"
              disabled={isBusy}
              onClick={handleAttendance}>
              <LoadingButtonContent
                isLoading={isClaiming}
                loadingLabel={CREDIT_SHORTAGE_COPY.attendanceClaiming}>
                {CREDIT_SHORTAGE_COPY.attendance}
              </LoadingButtonContent>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full text-foreground-secondary"
            disabled={isBusy}
            onClick={() => onOpenChange(false)}>
            {CREDIT_SHORTAGE_COPY.close}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
