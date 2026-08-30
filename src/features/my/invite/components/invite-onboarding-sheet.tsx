'use client';

import { useEffect, useRef, useState } from 'react';

import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { track } from '@/observability/analytics';

import { InviteOnboardingCodeForm } from './invite-onboarding-code-form';

export function InviteOnboardingSheet() {
  const { data: session, status, update } = useSession();
  const container = useAppFrameContainer();
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
    container !== null &&
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
    <Drawer
      open={isOpen}
      dismissible={!isCompleting}
      onOpenChange={handleOpenChange}>
      <DrawerContent
        container={container}
        className="absolute overflow-y-auto overscroll-contain"
        overlayClassName="absolute">
        <DrawerHeader className="gap-2 px-4 pt-4 pb-0 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <DrawerTitle className="text-xl leading-snug font-bold whitespace-pre-line">
            {'초대 코드를 등록하면\n500 크레딧을 받을 수 있어요'}
          </DrawerTitle>
          <DrawerDescription className="text-base leading-relaxed">
            지금은 건너뛰고 나중에 등록해도 돼요
          </DrawerDescription>
        </DrawerHeader>

        {hasCloseFailed ? (
          <div
            className="flex flex-col gap-8 px-4 pt-8 pb-4"
            role="status"
            aria-busy={isCompleting}>
            <p className="rounded-lg bg-muted p-4 text-sm">
              500 크레딧은 정상 지급되었지만, 창을 닫는 데 실패했어요
            </p>
            <Button
              type="button"
              size="lg"
              className="relative w-full"
              disabled={isCompleting}
              onClick={() => void complete({ fromRedeem: true })}>
              <LoadingButtonContent
                isLoading={isCompleting}
                loadingLabel="닫는 중">
                닫기
              </LoadingButtonContent>
            </Button>
          </div>
        ) : (
          <InviteOnboardingCodeForm
            key={userId}
            disabled={isCompleting}
            isSubmitPending={isCompleting && hasRedeemed}
            onSkip={handleSkip}
            onSuccess={handleRedeemSuccess}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
