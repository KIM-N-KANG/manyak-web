'use client';

import { useEffect } from 'react';

import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useGetPushSettings } from '@/api/generated/endpoints/push/push';
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

import { MARKETING_CONSENT_COPY } from '../constants/push-copy';
import { useMarketingConsent } from '../hooks/use-marketing-consent';
import { usePushPromptState } from '../hooks/use-push-prompt-state';
import { shouldDeferInviteOnboarding } from '../utils/invite-onboarding-run';
import {
  clearMarketingConsentAnswer,
  clearMarketingConsentReask,
  useMarketingConsentSignal,
} from '../utils/marketing-consent-store';
import { normalizePushSettings } from '../utils/push-settings';
import { PushConsentNoticeDialog } from './push-consent-notice-dialog';

/**
 * 광고 알림 동의를 저장하고, 첫 거절 뒤 조건이 맞으면 한 번 더 묻는 루트 시트.
 *
 * @remarks
 * 두 가지 신호를 받는다.
 * - 답 신호: 필수 동의 시트에서 고른 광고 동의 답이다. 받는 즉시 신호를 비우고 저장한다.
 * - 재질문 신호: 재진입 집계가 요청한 회원이다. 아래 조건을 모두 만족할 때만 시트를 연다.
 *   회원으로 확정됐고, 신호의 회원이 현재 세션 회원이고, 기기 알림 권한이 허용됐고, 초대 코드
 *   온보딩이 대기 중이 아니거나 미뤄졌고, 서버 푸시 설정의 광고 알림이 꺼져 있어야 한다.
 *
 * 회원 판정이 끝난 뒤 앞의 조건(서버 설정 제외)이 깨진 재질문 신호는 렌더 중에 지워 나중에
 * 다시 열리지 않게 한다. 시트를 닫는 것은 거절로 본다.
 */
export function MarketingConsentSheet() {
  const { data: session } = useSession();
  const { isMember } = useMemberAccess();
  const container = useAppFrameContainer();
  const promptState = usePushPromptState();
  const { answer: pendingAnswer, reaskUserId } = useMarketingConsentSignal();
  const { answer, isSubmitting, notice, closeNotice } = useMarketingConsent();
  const userId = session?.user.id ?? null;
  const reaskCandidate =
    isMember &&
    userId !== null &&
    reaskUserId === userId &&
    promptState === 'granted' &&
    (session?.inviteOnboardingPending !== true ||
      shouldDeferInviteOnboarding(userId));
  const settingsQuery = useGetPushSettings({
    query: { enabled: reaskCandidate },
  });
  const settings =
    settingsQuery.data?.status === 200
      ? normalizePushSettings(settingsQuery.data.data)
      : null;
  const isOpen =
    container !== null &&
    reaskCandidate &&
    settings !== null &&
    !settings.marketingPush;

  useEffect(() => {
    if (!pendingAnswer) {
      return;
    }

    clearMarketingConsentAnswer();
    void answer(pendingAnswer.userId, pendingAnswer.accepted);
    // answer는 렌더마다 새 함수라 의존성에 넣으면 답을 두 번 처리한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAnswer]);

  if (reaskUserId !== null && !reaskCandidate && isMember && userId !== null) {
    clearMarketingConsentReask();
  }

  if (isOpen && settings?.marketingPush) {
    clearMarketingConsentReask();
  }

  const respond = (accepted: boolean) => {
    if (isSubmitting || !userId) {
      return;
    }

    clearMarketingConsentReask();
    void answer(userId, accepted);
  };

  const handleNoticeClose = () => {
    closeNotice();

    if (promptState !== 'granted') {
      toast(MARKETING_CONSENT_COPY.deviceDisabledHint);
    }
  };

  return (
    <>
      <Drawer
        open={isOpen}
        disablePointerDismissal={isSubmitting}
        onOpenChange={(open) => {
          if (!open) {
            respond(false);
          }
        }}>
        <DrawerContent container={container} aria-busy={isSubmitting}>
          <DrawerHeader className="gap-2 px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
            <DrawerTitle className="text-xl leading-snug font-bold">
              {MARKETING_CONSENT_COPY.title}
            </DrawerTitle>
            <DrawerDescription className="text-base leading-6 text-foreground-secondary">
              {MARKETING_CONSENT_COPY.description}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2 px-4 pt-8 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button
              type="button"
              size="lg"
              className="relative w-full"
              disabled={isSubmitting}
              onClick={() => respond(true)}>
              <LoadingButtonContent
                isLoading={isSubmitting}
                loadingLabel={MARKETING_CONSENT_COPY.accept}>
                {MARKETING_CONSENT_COPY.accept}
              </LoadingButtonContent>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full text-foreground-secondary"
              disabled={isSubmitting}
              onClick={() => respond(false)}>
              {MARKETING_CONSENT_COPY.decline}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
      <PushConsentNoticeDialog notice={notice} onClose={handleNoticeClose} />
    </>
  );
}
