'use client';

import { useEffect, useRef } from 'react';

import { Copy01Icon, Share08Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useGetMyInvite } from '@/api/generated/endpoints/invite/invite';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { NoticeList } from '@/features/my/_shared/components/notice-list';
import { track } from '@/observability/analytics';

import { INVITE_GUIDE } from '../constants';
import { KAKAO_SDK_URL, useKakaoShare } from '../hooks/use-kakao-share';
import { InviteCodeForm } from './invite-code-form';
import { InviteRewardDescription } from './invite-reward-description';

/**
 * 내 초대 코드를 보여 주고 복사, 카카오톡 공유, 다른 사람 코드 등록을 제공하는 초대 화면.
 * 카카오 SDK가 준비되기 전에는 공유 버튼을 비활성화하고, 이번 달 보상 진행은 서버가 횟수와
 * 상한을 모두 돌려줄 때만 보인다. 비로그인으로 확정되면 로그인 화면으로 replace한다.
 */
export function InviteScreen() {
  const { data: session, status } = useSession();
  const { isMember } = useMemberAccess();
  const viewedUserIdRef = useRef<string | null>(null);
  const router = useRouter();
  const {
    isReady: isKakaoReady,
    handleSdkLoad,
    shareInviteCode,
  } = useKakaoShare();
  const { data, isPending, isFetching, refetch } = useGetMyInvite({
    query: {
      refetchOnMount: 'always',
      enabled: isMember,
    },
  });
  const invite = data?.status === 200 ? data.data : undefined;
  const inviteCode = invite?.inviteCode;
  const isInviteUnavailable = !isPending && !inviteCode;
  const hasMonthlyProgress =
    Boolean(inviteCode) &&
    typeof invite?.monthlyRewardCount === 'number' &&
    typeof invite.monthlyRewardLimit === 'number';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(APP_PATH.LOGIN);
    }

    const userId = session?.user.id;

    if (
      status === 'authenticated' &&
      userId &&
      viewedUserIdRef.current !== userId
    ) {
      viewedUserIdRef.current = userId;
      track('client_invite_viewed');
    }
  }, [session?.user.id, status, router]);

  const handleCopy = () => {
    track('client_invite_copyButton_clicked');

    if (!inviteCode) {
      toast.error(TOAST_MESSAGE.INVITE_CODE_COPY_FAILED);

      return;
    }

    navigator.clipboard
      .writeText(inviteCode)
      .then(() => toast.success(TOAST_MESSAGE.INVITE_CODE_COPIED))
      .catch(() => toast.error(TOAST_MESSAGE.INVITE_CODE_COPY_FAILED));
  };

  const handleKakaoShare = () => {
    track('client_invite_kakaoShareButton_clicked');

    if (!inviteCode) {
      toast.error(TOAST_MESSAGE.INVITE_SHARE_FAILED);

      return;
    }

    shareInviteCode(inviteCode);
  };

  return (
    <div className="flex flex-1 flex-col">
      <Script
        src={KAKAO_SDK_URL}
        strategy="lazyOnload"
        onReady={handleSdkLoad}
      />

      <header className="flex flex-col items-start gap-1 p-4">
        <h1 className="text-xl font-semibold">
          친구를 초대하고
          <br />
          함께 이프를 받아보세요
        </h1>
        <InviteRewardDescription />
      </header>

      <section className="flex flex-col gap-2 p-4" aria-label="내 초대 코드">
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg bg-muted p-4 text-center"
          aria-busy={isPending || isFetching}
          aria-live="polite">
          <span className="text-sm font-semibold text-foreground-secondary">
            내 초대 코드
          </span>
          {isPending ? <Skeleton className="h-7 w-32 bg-foreground/5" /> : null}
          {!isPending && !isInviteUnavailable ? (
            <span className="text-xl font-bold tracking-widest tabular-nums">
              {inviteCode}
            </span>
          ) : null}
          {isInviteUnavailable ? (
            <>
              <p className="text-sm text-foreground-secondary">
                초대 코드를 불러오지 못했어요
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isFetching}
                onClick={() => void refetch()}>
                {isFetching ? '다시 시도 중...' : '다시 시도하기'}
              </Button>
            </>
          ) : null}
          {hasMonthlyProgress ? (
            <p className="text-xs text-foreground-secondary">
              이번 달 받은 보상 {invite.monthlyRewardCount}/
              {invite.monthlyRewardLimit}회
            </p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-w-0 flex-1"
            disabled={!inviteCode}
            onClick={handleCopy}>
            <HugeiconsIcon icon={Copy01Icon} aria-hidden="true" />
            코드 복사하기
          </Button>
          <Button
            type="button"
            className="min-w-0 flex-1"
            disabled={!inviteCode || !isKakaoReady}
            onClick={handleKakaoShare}>
            <HugeiconsIcon icon={Share08Icon} aria-hidden="true" />
            카카오톡 공유하기
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4 p-4">
        <h2 className="text-lg font-bold">받은 초대 코드가 있나요?</h2>
        <InviteCodeForm />
      </section>

      <NoticeList
        title={INVITE_GUIDE.title}
        items={INVITE_GUIDE.lines}
        className="p-4"
      />
    </div>
  );
}
