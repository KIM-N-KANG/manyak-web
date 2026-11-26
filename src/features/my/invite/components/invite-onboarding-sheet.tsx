'use client';

import { useEffect, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
} from '@/components/ui/drawer';
import { APP_PATH } from '@/constants/app-path';
import { formatCreditAmount } from '@/constants/credit';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { shouldDeferInviteOnboarding } from '@/features/my/_shared/utils/invite-onboarding-run';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { useCreditPolicySnapshot } from '@/hooks/use-credit-policy';
import { track } from '@/observability/analytics';

import { buildInviteRewardCopy } from '../constants';
import { InviteOnboardingCodeForm } from './invite-onboarding-code-form';
import { InviteOnboardingTitle } from './invite-onboarding-title';

/**
 * 가입 직후 초대 코드 등록을 권하는 온보딩 시트.
 *
 * @remarks
 * 회원으로 확정됐고, 세션의 `inviteOnboardingPending`이 true이고, 이번 접속에서 미루지 않으며,
 * 스토리 목록 화면일 때만 연다. 상태는 모두 사용자 id로 기억해 다른 계정으로 바뀌면 저절로 풀린다.
 * - `dismissedUserId`: 안내를 마쳐 이 계정에서는 다시 열지 않는다.
 * - `completingUserId`: 안내 완료를 세션에 저장하는 중이다. 이 동안에는 회원 판정이 흔들려도 열어 둔다.
 * - `redeemedUserId`: 코드 등록에 성공했다. 닫는 동안 등록 버튼의 로딩 표시를 이어 간다.
 * - `closeFailedUserId`: 등록 성공 뒤 완료 저장에 실패했다. 폼 대신 다시 닫기 화면을 보여 준다.
 * - `shownUserIdRef`: 노출 이벤트를 계정당 한 번만 보낸다.
 *
 * 건너뛰기, 닫기, 등록 성공 모두 `session.update`로 `inviteOnboardingPending`을 false로 바꿔
 * 안내를 소비한다. 갱신된 세션이 같은 회원이고 값이 false일 때만 성공으로 본다.
 */
export function InviteOnboardingSheet() {
  const { data: session, update } = useSession();
  const pathname = usePathname();
  const { isMember } = useMemberAccess();
  const container = useAppFrameContainer();
  const readCreditPolicy = useCreditPolicySnapshot();
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
    (isMember || isCompleting) &&
    userId !== null &&
    session?.inviteOnboardingPending === true &&
    dismissedUserId !== userId &&
    !shouldDeferInviteOnboarding(userId) &&
    pathname === APP_PATH.MAIN.STORIES;

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
      disablePointerDismissal={isCompleting}
      onOpenChange={handleOpenChange}>
      <DrawerContent container={container}>
        <DrawerHeader className="gap-2 px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <InviteOnboardingTitle />
          <DrawerDescription className="text-base leading-relaxed">
            지금은 건너뛰고 나중에 등록해도 돼요
          </DrawerDescription>
        </DrawerHeader>

        {hasCloseFailed ? (
          <div
            className="flex min-h-0 flex-col gap-8 overflow-y-auto overscroll-contain px-4 pt-8 pb-4"
            role="status"
            aria-busy={isCompleting}>
            <p className="rounded-lg bg-muted p-4 text-sm">
              {
                buildInviteRewardCopy(
                  formatCreditAmount(readCreditPolicy()?.inviteReward),
                ).onboardingCloseFailed
              }
            </p>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="relative w-full text-foreground-secondary"
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
