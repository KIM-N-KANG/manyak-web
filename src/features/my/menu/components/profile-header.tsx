'use client';

import { useState } from 'react';

import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { useMe } from '@/api/generated/endpoints/auth/auth';
import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_PATH } from '@/constants/app-path';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { track } from '@/observability/analytics';

import { LinkedAccountSection } from './linked-account-section';

export function ProfileHeader() {
  const { data: session, status } = useSession();
  const { isMember } = useMemberAccess();
  const [imageError, setImageError] = useState(false);

  const isAuthenticated = status === 'authenticated';
  const isSessionLoading = status === 'loading';
  const isGuest = status === 'unauthenticated';

  const { data: meData } = useMe({
    query: { enabled: isMember, refetchOnMount: 'always' },
  });
  const me = meData?.status === 200 ? meData.data : undefined;
  const nickname = me?.nickname ?? session?.user?.name ?? '';
  const thumbnailSrc = me?.profileThumbnailBase64
    ? `data:image/png;base64,${me.profileThumbnailBase64}`
    : undefined;
  const profileImageSrc = thumbnailSrc ?? session?.user?.image;

  return (
    <section className="relative flex items-center gap-4">
      {profileImageSrc && !imageError ? (
        <Image
          src={profileImageSrc}
          alt=""
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        // 게스트는 프로필 이미지가 없으므로 빈 원 가운데에 마냑 심볼을 옅게 둔다.
        <div
          aria-hidden="true"
          data-testid="profile-placeholder"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted">
          {isGuest && (
            <ManyakSymbolIcon className="size-7 text-foreground-tertiary" />
          )}
        </div>
      )}
      {isSessionLoading ? (
        <div className="flex-1">
          <Skeleton className="h-7 w-24" />
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {isMember ? (
            <Link
              href={APP_PATH.MY_PROFILE_EDIT}
              className="flex min-w-0 items-center gap-1 outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring">
              <span className="truncate text-lg font-semibold">{nickname}</span>
              <span className="sr-only">프로필 수정</span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-5 shrink-0 text-foreground-tertiary"
                aria-hidden
              />
            </Link>
          ) : (
            <span className="truncate text-lg font-semibold">
              {isAuthenticated ? nickname : '게스트'}
            </span>
          )}
          {isMember && (
            <div className="relative">
              <LinkedAccountSection />
            </div>
          )}
        </div>
      )}
      {isGuest && (
        <Link
          href={APP_PATH.LOGIN}
          className={buttonVariants()}
          onClick={() => {
            track('client_account_loginButton_clicked');
          }}>
          로그인
        </Link>
      )}
    </section>
  );
}
