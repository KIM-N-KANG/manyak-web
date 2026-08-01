'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { useMe } from '@/api/generated/endpoints/auth/auth';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { GoogleLogo } from '@/features/auth/_shared/components/google-logo';
import { KakaoLogo } from '@/features/auth/_shared/components/kakao-logo';
import {
  isSocialLoginProvider,
  type SocialLoginProvider,
} from '@/lib/auth/social-provider';
import { cn } from '@/lib/utils';
import { track } from '@/observability/analytics';

import {
  LINK_ACCOUNT_COPY,
  PROVIDER_LABEL,
} from '../constants/link-account-copy';
import { useLinkResultNotice } from '../hooks/use-link-result-notice';
import {
  isAccountLinkBlocked,
  startAccountLink,
} from '../utils/start-account-link';

const ALL_PROVIDERS: readonly SocialLoginProvider[] = ['google', 'kakao'];

const PROVIDER_LOGOS: Record<SocialLoginProvider, typeof GoogleLogo> = {
  google: GoogleLogo,
  kakao: KakaoLogo,
};

export function LinkedAccountSection() {
  const { data: meData, isPending } = useMe({
    query: { refetchOnMount: 'always' },
  });
  const { isLinkedToOtherUserOpen, dismissLinkedToOtherUser } =
    useLinkResultNotice();
  const [confirmTarget, setConfirmTarget] =
    useState<SocialLoginProvider | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const me = meData?.status === 200 ? meData.data : undefined;
  const linkedProviders = (me?.linkedProviders ?? []).filter(
    isSocialLoginProvider,
  );
  const currentProvider = linkedProviders[0];
  const unlinkedProviders = ALL_PROVIDERS.filter(
    (provider) => !linkedProviders.includes(provider),
  );

  if (isPending) {
    return (
      <div
        role="status"
        aria-label={LINK_ACCOUNT_COPY.sectionLoadingLabel}
        className="flex flex-wrap items-center gap-1">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-28" />
      </div>
    );
  }

  if (!currentProvider) {
    return null;
  }

  const handleLinkClick = (target: SocialLoginProvider) => {
    track('client_account_linkAccountButton_clicked', { provider: target });

    if (isAccountLinkBlocked()) {
      toast.warning(TOAST_MESSAGE.LINK_BLOCKED_IN_APP);

      return;
    }

    setConfirmTarget(target);
  };

  const handleConfirm = (target: SocialLoginProvider) => {
    setIsStarting(true);
    void startAccountLink(currentProvider, target);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      aria-label={LINK_ACCOUNT_COPY.sectionLabel}>
      {linkedProviders.map((provider) => {
        const Logo = PROVIDER_LOGOS[provider];

        return (
          <span
            key={provider}
            className={cn(
              badgeVariants({ variant: 'outline' }),
              'h-6 gap-1.5 text-foreground-secondary',
            )}>
            <Logo className="size-3" />
            {PROVIDER_LABEL[provider]}
          </span>
        );
      })}
      {unlinkedProviders.map((provider) => {
        const Logo = PROVIDER_LOGOS[provider];

        return (
          <button
            key={provider}
            type="button"
            onClick={() => handleLinkClick(provider)}
            className={cn(
              badgeVariants({ variant: 'outline' }),
              'h-6 gap-1.5 border-dashed text-foreground-secondary',
            )}>
            <Logo className="size-3" />
            {LINK_ACCOUNT_COPY.linkButton(provider)}
          </button>
        );
      })}
      {confirmTarget !== null && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !isStarting) {
              setConfirmTarget(null);
            }
          }}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>
                {LINK_ACCOUNT_COPY.confirmTitle(confirmTarget)}
              </DialogTitle>
              <DialogDescription className="flex flex-col gap-2 leading-relaxed">
                {LINK_ACCOUNT_COPY.confirmDescription(
                  currentProvider,
                  confirmTarget,
                ).map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                disabled={isStarting}
                onClick={() => setConfirmTarget(null)}>
                {LINK_ACCOUNT_COPY.confirmCancel}
              </Button>
              <Button
                type="button"
                className="relative"
                disabled={isStarting}
                onClick={() => handleConfirm(confirmTarget)}>
                <LoadingButtonContent
                  isLoading={isStarting}
                  loadingLabel={LINK_ACCOUNT_COPY.confirmPending}>
                  {LINK_ACCOUNT_COPY.confirmAction}
                </LoadingButtonContent>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {isLinkedToOtherUserOpen && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) {
              dismissLinkedToOtherUser();
            }
          }}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{LINK_ACCOUNT_COPY.linkedToOtherTitle}</DialogTitle>
              <DialogDescription className="flex flex-col gap-2 leading-relaxed">
                {LINK_ACCOUNT_COPY.linkedToOtherDescription.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="grid-cols-1">
              <Button type="button" onClick={dismissLinkedToOtherUser}>
                {LINK_ACCOUNT_COPY.linkedToOtherAction}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
