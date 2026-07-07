'use client';

import { useState } from 'react';

import {
  ArrowRight01Icon,
  Logout03Icon,
  MailEdit01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

import { useMe } from '@/api/generated/endpoints/auth/auth';
import { buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_PATH } from '@/constants/app-path';
import { resetAnalyticsUser } from '@/observability/analytics';

import { CreditBalanceCard } from './credit-balance-card';

export function MyPage() {
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

  const handleLogout = () => {
    resetAnalyticsUser();
    void signOut({ redirectTo: APP_PATH.MAIN.MY });
  };

  return (
    <main className="flex flex-1 flex-col pb-4">
      <section className="mb-4 flex items-center gap-4 p-4">
        {profileImageUrl && !imageError ? (
          <Image
            src={profileImageUrl}
            alt=""
            width={48}
            height={48}
            className="size-16 shrink-0 rounded-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            aria-hidden="true"
            className="size-16 shrink-0 rounded-full bg-muted"
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

      {isSessionLoading && (
        <section className="-mt-4 mb-4 p-4 pt-0">
          <Skeleton className="h-18 rounded-lg" />
        </section>
      )}
      {isAuthenticated && <CreditBalanceCard />}

      <section className="flex flex-col gap-2 py-4">
        <div className="px-4">
          <Label>기타</Label>
        </div>
        <Link
          href={APP_PATH.MY_FEEDBACK}
          className="flex h-12 items-center gap-4 px-4">
          <HugeiconsIcon
            icon={MailEdit01Icon}
            className="size-6"
            aria-hidden="true"
          />
          <span className="flex-1">피드백</span>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-5 text-foreground-tertiary"
            aria-hidden="true"
          />
        </Link>
      </section>

      {isAuthenticated && (
        <section className="flex flex-col gap-2 py-4">
          <div className="px-4">
            <Label>계정</Label>
          </div>
          <button
            type="button"
            className="flex h-12 items-center gap-4 px-4 text-destructive"
            onClick={handleLogout}>
            <HugeiconsIcon
              icon={Logout03Icon}
              className="size-6"
              aria-hidden="true"
            />
            <span>로그아웃</span>
          </button>
        </section>
      )}
    </main>
  );
}
