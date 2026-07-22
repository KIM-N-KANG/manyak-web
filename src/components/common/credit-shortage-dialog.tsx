'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { useMe } from '@/api/generated/endpoints/auth/auth';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { APP_PATH } from '@/constants/app-path';
import { useClaimAttendance } from '@/features/more/_shared/hooks/use-claim-attendance';
import { type CreditShortageTrigger, track } from '@/observability/analytics';

type CreditShortageDialogProps = {
  trigger: CreditShortageTrigger | null;
  onOpenChange: (open: boolean) => void;
};

export function CreditShortageDialog({
  trigger,
  onOpenChange,
}: CreditShortageDialogProps) {
  const router = useRouter();
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const { data } = useMe({
    query: {
      refetchOnMount: 'always',
      enabled: isAuthenticated && trigger !== null,
    },
  });
  const { claimAttendance, isClaiming } = useClaimAttendance({
    onRewarded: () => onOpenChange(false),
  });

  const me = data?.status === 200 ? data.data : undefined;
  const attendedToday = me?.attendedToday ?? false;
  const isMeReady = me !== undefined;

  useEffect(() => {
    if (trigger) {
      track('client_creditShortageDialog_shown', { trigger });
    }
  }, [trigger]);

  const handleAttendance = () => {
    if (trigger) {
      track('client_creditShortageDialog_attendanceButton_clicked', {
        trigger,
      });
    }

    claimAttendance();
  };

  const handleEarn = () => {
    if (trigger) {
      track('client_creditShortageDialog_earnButton_clicked', { trigger });
    }

    router.push(APP_PATH.MORE_INVITE);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && trigger) {
      track('client_creditShortageDialog_dismissed', { trigger });
    }

    onOpenChange(open);
  };

  return (
    <Dialog open={trigger !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>크레딧이 부족해요</DialogTitle>
          <DialogDescription>
            출석 체크를 하거나, 친구를 초대하고 함께 크레딧을 받아보세요
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="relative"
            disabled={!isMeReady || attendedToday || isClaiming}
            onClick={handleAttendance}>
            <LoadingButtonContent
              isLoading={isClaiming}
              loadingLabel="출석 체크 중">
              {attendedToday ? '출석 완료' : '출석 체크하기'}
            </LoadingButtonContent>
          </Button>
          <Button type="button" onClick={handleEarn}>
            친구 초대 하러 가기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
