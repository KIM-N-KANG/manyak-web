'use client';

import { useEffect, useRef, useState } from 'react';

import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

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
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { track } from '@/observability/analytics';

import { InviteOnboardingCodeForm } from './invite-onboarding-code-form';

export function InviteOnboardingDialog() {
  const { data: session, status, update } = useSession();
  const [dismissedUserId, setDismissedUserId] = useState<string | null>(null);
  const [completingUserId, setCompletingUserId] = useState<string | null>(null);
  const [redeemedUserId, setRedeemedUserId] = useState<string | null>(null);
  const [closeFailedUserId, setCloseFailedUserId] = useState<string | null>(
    null,
  );
  const shownUserIdRef = useRef<string | null>(null);
  const userId = session?.user.id ?? null;
  const isCompleting = userId !== null && completingUserId === userId;
  const hasRedeemed = userId !== null && redeemedUserId === userId;
  const hasCloseFailed = userId !== null && closeFailedUserId === userId;
  const isOpen =
    (status === 'authenticated' || isCompleting) &&
    userId !== null &&
    session?.inviteOnboardingPending === true &&
    dismissedUserId !== userId;

  useEffect(() => {
    if (isOpen && shownUserIdRef.current !== userId) {
      shownUserIdRef.current = userId;
      track('client_inviteOnboarding_shown');
    }
  }, [isOpen, userId]);

  const complete = async ({ fromRedeem = false } = {}) => {
    if (!userId || isCompleting) {
      return;
    }

    const expectedUserId = userId;

    setCompletingUserId(expectedUserId);

    try {
      const updatedSession = await update({
        inviteOnboardingPending: false,
        expectedUserId,
      });
      const didConsumePending =
        updatedSession?.user.id === expectedUserId &&
        updatedSession.inviteOnboardingPending === false;

      if (!didConsumePending) {
        throw new Error('Invite onboarding session update was not applied.');
      }

      setDismissedUserId(expectedUserId);
    } catch {
      if (fromRedeem) {
        setCloseFailedUserId(expectedUserId);
      } else {
        toast.error(TOAST_MESSAGE.INVITE_ONBOARDING_SAVE_FAILED);
      }
    } finally {
      setCompletingUserId((currentUserId) =>
        currentUserId === expectedUserId ? null : currentUserId,
      );
    }
  };

  const handleSkip = () => {
    if (isCompleting) {
      return;
    }

    track('client_inviteOnboarding_skipped');
    void complete();
  };

  const handleOpenChange = (open: boolean) => {
    if (open || isCompleting) {
      return;
    }

    if (hasCloseFailed) {
      void complete({ fromRedeem: true });

      return;
    }

    handleSkip();
  };

  const handleRedeemSuccess = () => {
    if (!userId) {
      return;
    }

    setRedeemedUserId(userId);
    void complete({ fromRedeem: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>초대 코드가 있나요?</DialogTitle>
          <DialogDescription className="leading-relaxed">
            친구에게 받은 초대 코드를 등록하면 500 크레딧을 받을 수 있어요
          </DialogDescription>
        </DialogHeader>

        {hasCloseFailed ? (
          <div className="contents" role="status" aria-busy={isCompleting}>
            <p className="rounded-lg bg-muted p-4 text-sm">
              500 크레딧은 정상 지급되었지만, 창을 닫는 데 실패했어요
            </p>
            <DialogFooter className="grid-cols-1">
              <Button
                type="button"
                className="relative"
                disabled={isCompleting}
                onClick={() => void complete({ fromRedeem: true })}>
                <LoadingButtonContent
                  isLoading={isCompleting}
                  loadingLabel="닫는 중">
                  닫기
                </LoadingButtonContent>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <InviteOnboardingCodeForm
            key={userId}
            disabled={isCompleting}
            isSubmitPending={isCompleting && hasRedeemed}
            onSuccess={handleRedeemSuccess}
            onSkip={handleSkip}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
