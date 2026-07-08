'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { useMe } from '@/api/generated/endpoints/auth/auth';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_PATH } from '@/constants/app-path';

export function ProfileHeader() {
  const { data: session, status } = useSession();
  const [imageError, setImageError] = useState(false);

  const isAuthenticated = status === 'authenticated';
  const isSessionLoading = status === 'loading';

  const { data: meData } = useMe({
    query: { enabled: isAuthenticated, refetchOnMount: 'always' },
  });
  const me = meData?.status === 200 ? meData.data : undefined;
  const nickname = me?.nickname ?? session?.user?.name ?? '';
  const profileImageUrl = me ? me.profileImageUrl : session?.user?.image;

  return (
    <section className="mb-4 flex items-center gap-4 p-4">
      {profileImageUrl && !imageError ? (
        <Image
          src={profileImageUrl}
          alt=""
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          aria-hidden="true"
          className="size-14 shrink-0 rounded-full bg-muted"
        />
      )}
      {isSessionLoading ? (
        <div className="flex-1">
          <Skeleton className="h-7 w-24" />
        </div>
      ) : (
        <span className="min-w-0 flex-1 truncate text-lg font-semibold">
          {isAuthenticated ? nickname : '게스트'}
        </span>
      )}
      {status === 'unauthenticated' && (
        <Link href={APP_PATH.LOGIN} className={buttonVariants()}>
          로그인
        </Link>
      )}
    </section>
  );
}
