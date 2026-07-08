'use client';

import { useEffect } from 'react';

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
import { track } from '@/observability/analytics';

import { KAKAO_SDK_URL, useKakaoShare } from '../hooks/use-kakao-share';

const INVITE_GUIDE_LINES = [
  '친구가 내 초대 링크로 가입하면 나와 친구 모두 500 크레딧을 받아요.',
  '초대 보상은 계정별로 매월 10회까지 받을 수 있어요 (한국 시간 기준, 매월 초기화).',
  '친구가 링크로 들어간 뒤 24시간 안에 가입해야 보상이 적립돼요.',
  '보상으로 받은 크레딧은 적립일부터 30일 동안 사용할 수 있어요.',
  '본 이벤트는 사전 고지 없이 변경되거나 종료될 수 있어요.',
];

export function InviteScreen() {
  const { status } = useSession();
  const router = useRouter();
  const {
    isReady: isKakaoReady,
    handleSdkLoad,
    shareInviteLink,
  } = useKakaoShare();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(APP_PATH.LOGIN);
    }
  }, [status, router]);

  useEffect(() => {
    track('client_invite_viewed');
  }, []);

  const { data } = useGetMyInvite({
    query: { refetchOnMount: 'always', enabled: status === 'authenticated' },
  });
  const invite = data?.status === 200 ? data.data : undefined;
  const inviteUrl = invite?.inviteUrl;

  const handleCopy = () => {
    track('client_invite_copyButton_clicked');

    if (!inviteUrl) {
      toast.error(TOAST_MESSAGE.INVITE_LINK_COPY_FAILED);

      return;
    }

    navigator.clipboard
      .writeText(inviteUrl)
      .then(() => toast.success(TOAST_MESSAGE.INVITE_LINK_COPIED))
      .catch(() => toast.error(TOAST_MESSAGE.INVITE_LINK_COPY_FAILED));
  };

  const handleKakaoShare = () => {
    track('client_invite_kakaoShareButton_clicked');

    if (!inviteUrl) {
      toast.error(TOAST_MESSAGE.INVITE_SHARE_FAILED);

      return;
    }

    shareInviteLink(inviteUrl);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Script
        src={KAKAO_SDK_URL}
        strategy="lazyOnload"
        onLoad={handleSdkLoad}
      />

      <section className="flex flex-col items-center gap-1 rounded-lg bg-muted p-4">
        <span className="text-sm text-foreground-secondary">내 초대 코드</span>
        {invite?.inviteCode ? (
          <span className="text-xl font-bold tracking-widest tabular-nums">
            {invite.inviteCode}
          </span>
        ) : (
          <Skeleton className="h-8 w-40 bg-foreground/5" />
        )}
      </section>

      <div className="flex gap-2">
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="flex-1"
          disabled={!inviteUrl}
          onClick={handleCopy}>
          <HugeiconsIcon icon={Copy01Icon} aria-hidden="true" />
          링크 복사
        </Button>
        <Button
          type="button"
          size="lg"
          className="flex-1"
          disabled={!inviteUrl || !isKakaoReady}
          onClick={handleKakaoShare}>
          <HugeiconsIcon icon={Share08Icon} aria-hidden="true" />
          카카오톡 공유
        </Button>
      </div>

      <section className="mt-4 flex flex-col gap-2">
        <h2 className="text-lg font-bold">이용 안내</h2>
        <ul className="flex list-disc flex-col px-4 text-sm leading-normal">
          {INVITE_GUIDE_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
