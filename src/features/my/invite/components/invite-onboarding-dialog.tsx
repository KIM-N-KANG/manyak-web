'use client';

import { useEffect, useRef, useState } from 'react';

import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { track } from '@/observability/analytics';

import { InviteCodeForm } from './invite-code-form';

export function InviteOnboardingDialog() {
  const { data: session, status, update } = useSession();
  const [dismissedUserId, setDismissedUserId] = useState<string | null>(null);
  const [completingUserId, setCompletingUserId] = useState<string | null>(null);
  const [redeemedUserId, setRedeemedUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shownUserIdRef = useRef<string | null>(null);
  const userId = session?.user.id ?? null;
  const isCompleting = userId !== null && completingUserId === userId;
  const hasRedeemed = userId !== null && redeemedUserId === userId;
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

  const complete = async () => {
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
      toast.error(TOAST_MESSAGE.INVITE_ONBOARDING_SAVE_FAILED);
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
    void complete();
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent
        size="sm"
        className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] overflow-y-auto overscroll-contain">
        <AlertDialogHeader>
          <AlertDialogTitle>초대 코드가 있나요?</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            친구에게 받은 초대 코드를 입력하면 나와 친구 모두 500 크레딧을
            받아요.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasRedeemed ? (
          <div
            className="flex flex-col gap-3 rounded-lg bg-muted p-4 text-sm"
            role="status"
            aria-busy={isCompleting}>
            <p className="leading-relaxed">
              {isCompleting
                ? '초대 코드 안내 상태를 저장하고 있어요.'
                : '크레딧은 받았어요. 안내를 닫으려면 상태 저장을 다시 시도해 주세요.'}
            </p>
            {!isCompleting ? (
              <Button type="button" size="lg" onClick={() => void complete()}>
                다시 시도
              </Button>
            ) : null}
          </div>
        ) : (
          <InviteCodeForm
            key={userId}
            source="onboarding"
            autoFocus
            disabled={isCompleting}
            onPendingChange={setIsSubmitting}
            onSuccess={handleRedeemSuccess}
          />
        )}

        {!hasRedeemed ? (
          <AlertDialogFooter className="grid-cols-1">
            <AlertDialogCancel
              className="h-12 w-full"
              size="lg"
              disabled={isSubmitting || isCompleting}
              onClick={handleSkip}>
              나중에 입력하기
            </AlertDialogCancel>
          </AlertDialogFooter>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
