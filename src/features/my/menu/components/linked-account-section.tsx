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

/**
 * 연동된 소셜 계정 배지와 아직 연동하지 않은 공급자의 연동 버튼을 보여 주는 마이 화면 섹션.
 *
 * @remarks
 * 서버가 돌려준 연동 목록의 첫 공급자를 재인증에 쓸 현재 계정으로 삼고, 연동 목록이 비면
 * 섹션을 그리지 않는다. 연동 버튼은 인앱 브라우저에서 토스트로 막고, 그 밖에는 확인 다이얼로그를
 * 거쳐 연동을 시작한다. 시작한 뒤에는 페이지를 떠날 때까지 다이얼로그를 닫지 않는다. 연동 흐름에서
 * 돌아와 이미 다른 회원에 연결된 계정(409)이면 별도 안내 다이얼로그를 띄운다.
 *
 * @see startAccountLink
 * @see useLinkResultNotice
 */
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
