'use client';

import { useEffect, useRef, useState } from 'react';

import { useSession } from 'next-auth/react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { track } from '@/observability/analytics';

import { InviteCodeForm } from './invite-code-form';

export function InviteOnboardingDialog() {
  const { data: session, status, update } = useSession();
  const [dismissedUserId, setDismissedUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shownUserIdRef = useRef<string | null>(null);
  const userId = session?.user.id ?? null;
  const isOpen =
    status === 'authenticated' &&
    userId !== null &&
    session.inviteOnboardingPending === true &&
    dismissedUserId !== userId;

  useEffect(() => {
    if (isOpen && shownUserIdRef.current !== userId) {
      shownUserIdRef.current = userId;
      track('client_inviteOnboarding_shown');
    }
  }, [isOpen, userId]);

  const complete = () => {
    if (!userId) {
      return;
    }

    setDismissedUserId(userId);
    void update({ inviteOnboardingPending: false });
  };

  const handleSkip = () => {
    track('client_inviteOnboarding_skipped');
    complete();
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

        <InviteCodeForm
          source="onboarding"
          autoFocus
          onPendingChange={setIsSubmitting}
          onSuccess={complete}
        />

        <AlertDialogFooter className="grid-cols-1">
          <AlertDialogCancel
            className="h-12 w-full"
            size="lg"
            disabled={isSubmitting}
            onClick={handleSkip}>
            나중에 입력하기
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
