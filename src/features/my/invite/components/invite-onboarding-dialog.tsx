'use client';

import { useEffect, useRef, useState } from 'react';

import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
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
      // 적립 경로는 토스트 대신 다이얼로그 안에서 실패 안내·재시도를 제공한다.
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

  const handleRedeemSuccess = () => {
    if (!userId) {
      return;
    }

    setRedeemedUserId(userId);
    void complete({ fromRedeem: true });
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent
        size="sm"
        className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] overflow-y-auto overscroll-contain">
        <AlertDialogHeader>
          <AlertDialogTitle>초대 코드가 있나요?</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            친구에게 받은 초대 코드를 입력하면 500 크레딧을 받을 수 있어요
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasCloseFailed ? (
          <div
            className="flex flex-col gap-6"
            role="status"
            aria-busy={isCompleting}>
            <p className="rounded-lg bg-muted p-4 text-sm">
              500 크레딧은 정상 지급되었지만, 창을 닫는 데 실패했어요
            </p>
            <AlertDialogFooter>
              <AlertDialogAction
                type="button"
                className="col-span-full"
                disabled={isCompleting}
                onClick={() => void complete({ fromRedeem: true })}>
                {isCompleting ? <Spinner /> : '닫기'}
              </AlertDialogAction>
            </AlertDialogFooter>
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
      </AlertDialogContent>
    </AlertDialog>
  );
}
