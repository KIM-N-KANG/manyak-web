'use client';

import { useState } from 'react';

import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useGetPushSettings } from '@/api/generated/endpoints/push/push';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Checkbox } from '@/components/motion/checkbox';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { useCloseOnBack } from '@/hooks/use-close-on-back';

import { PUSH_PROMPT_COPY } from '../constants/push-copy';
import { usePushPromptState } from '../hooks/use-push-prompt-state';
import {
  type PushConsentNotice,
  usePushSettingsUpdate,
} from '../hooks/use-push-settings-update';
import { requestNotificationPermission } from '../utils/push-permission';
import {
  answerPushPromptRecord,
  readPushPromptRecord,
  writePushPromptRecord,
} from '../utils/push-prompt-storage';
import {
  clearPushPromptRequest,
  usePendingPushPromptUserId,
} from '../utils/push-prompt-store';
import { normalizePushSettings } from '../utils/push-settings';
import { PushConsentNoticeDialog } from './push-consent-notice-dialog';

export function PushPromptSheet() {
  const { data: session } = useSession();
  const { isMember } = useMemberAccess();
  const container = useAppFrameContainer();
  const pendingUserId = usePendingPushPromptUserId();
  const promptState = usePushPromptState();
  const userId = session?.user.id ?? null;
  const shouldAsk = promptState === 'prompt' || promptState === 'install';
  const isOpen =
    container !== null &&
    isMember &&
    userId !== null &&
    pendingUserId === userId &&
    shouldAsk;
  const [marketingChecked, setMarketingChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<PushConsentNotice | null>(null);
  const settingsQuery = useGetPushSettings({
    query: { enabled: isOpen && promptState === 'prompt' },
  });
  const { update } = usePushSettingsUpdate();
  const currentSettings = normalizePushSettings(
    settingsQuery.data?.status === 200 ? settingsQuery.data.data : undefined,
  );
  const showMarketing = !currentSettings.marketingPush;

  if (pendingUserId !== null && !shouldAsk && promptState !== 'unsupported') {
    clearPushPromptRequest();
  }

  const finish = (accepted: boolean) => {
    if (userId) {
      writePushPromptRecord(
        userId,
        answerPushPromptRecord(readPushPromptRecord(userId), accepted),
      );
    }

    clearPushPromptRequest();
    setMarketingChecked(false);
  };

  const dismiss = () => {
    if (!isSubmitting) {
      finish(false);
    }
  };

  useCloseOnBack({ open: isOpen, onClose: dismiss });

  const accept = async () => {
    setIsSubmitting(true);

    try {
      const permission = await requestNotificationPermission();

      if (permission !== 'granted') {
        toast.error(TOAST_MESSAGE.PUSH_PERMISSION_DENIED);
      }

      if (permission === 'granted' && marketingChecked && showMarketing) {
        try {
          const result = await update(currentSettings, {
            marketingPush: true,
          });

          setNotice(result.notice);
        } catch {
          toast.error(TOAST_MESSAGE.PUSH_SETTINGS_SAVE_FAILED);
        }
      }
    } finally {
      setIsSubmitting(false);
      finish(true);
    }
  };

  return (
    <>
      <Drawer
        open={isOpen}
        disablePointerDismissal={isSubmitting}
        onOpenChange={(open) => {
          if (!open) {
            dismiss();
          }
        }}>
        <DrawerContent container={container} aria-busy={isSubmitting}>
          <DrawerHeader className="gap-2 px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
            <DrawerTitle className="text-xl leading-snug font-bold">
              {promptState === 'install'
                ? PUSH_PROMPT_COPY.installTitle
                : PUSH_PROMPT_COPY.title}
            </DrawerTitle>
            <DrawerDescription className="text-base leading-relaxed break-keep">
              {promptState === 'install'
                ? PUSH_PROMPT_COPY.installDescription
                : PUSH_PROMPT_COPY.description}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex min-h-0 flex-col gap-8 overflow-y-auto overscroll-contain px-4 pt-8 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {promptState === 'prompt' && showMarketing && (
              <Checkbox
                checked={marketingChecked}
                disabled={isSubmitting}
                onCheckedChange={setMarketingChecked}
                label={
                  <span className="flex flex-col gap-0.5">
                    <span className="text-base">
                      {PUSH_PROMPT_COPY.marketingConsent}
                    </span>
                    <span className="text-sm text-foreground-secondary">
                      {PUSH_PROMPT_COPY.marketingDescription}
                    </span>
                  </span>
                }
              />
            )}

            <div className="flex flex-col gap-2">
              {promptState === 'prompt' ? (
                <>
                  <Button
                    type="button"
                    size="lg"
                    className="relative w-full"
                    disabled={isSubmitting}
                    onClick={() => void accept()}>
                    <LoadingButtonContent
                      isLoading={isSubmitting}
                      loadingLabel={PUSH_PROMPT_COPY.accept}>
                      {PUSH_PROMPT_COPY.accept}
                    </LoadingButtonContent>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="w-full text-foreground-secondary"
                    disabled={isSubmitting}
                    onClick={dismiss}>
                    {PUSH_PROMPT_COPY.later}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={dismiss}>
                  {PUSH_PROMPT_COPY.installClose}
                </Button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <PushConsentNoticeDialog
        notice={notice}
        onClose={() => setNotice(null)}
      />
    </>
  );
}
