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
import { useCloseOnBack } from '@/hooks/use-close-on-back';

import { MARKETING_CONSENT_COPY } from '../constants/push-copy';
import { useMarketingConsent } from '../hooks/use-marketing-consent';
import { usePushPromptState } from '../hooks/use-push-prompt-state';
import {
  clearMarketingConsentAnswer,
  clearMarketingConsentReask,
  useMarketingConsentSignal,
} from '../utils/marketing-consent-store';
import { normalizePushSettings } from '../utils/push-settings';
import { PushConsentNoticeDialog } from './push-consent-notice-dialog';

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
    session?.inviteOnboardingPending !== true;
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

  useCloseOnBack({ open: isOpen, onClose: () => respond(false) });

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
            <DrawerDescription className="text-base leading-6 break-keep text-foreground-secondary">
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
