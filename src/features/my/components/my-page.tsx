'use client';

import {
  ArrowRight01Icon,
  Logout03Icon,
  MailEdit01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

import { buttonVariants } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { resetAnalyticsUser } from '@/observability/analytics';

export function MyPage() {
  const { data: session, status } = useSession();

  const handleLogout = () => {
    // 공용 기기 보호 — 로그아웃 시 분석 식별자를 재발급한다(스펙 §6-2).
    resetAnalyticsUser();
    void signOut({ redirectTo: APP_PATH.MAIN.MY });
  };

  return (
    <main className="flex flex-1 flex-col gap-8 px-4 py-6">
      <section className="flex items-center gap-4">
        {session?.user?.image ? (
          // 프로필 이미지는 백엔드가 발급한 프리셋 자산 URL이라 next/image 최적화 대상이 아니다.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className="size-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="size-16 shrink-0 rounded-full bg-muted"
          />
        )}
        <span className="min-w-0 flex-1 truncate text-xl font-bold">
          {status === 'authenticated' ? session.user.name : '게스트'}
        </span>
        {status === 'unauthenticated' && (
          <Link href={APP_PATH.LOGIN} className={buttonVariants()}>
            로그인
          </Link>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-foreground-tertiary">기타</h2>
        <Link
          href={APP_PATH.MY_FEEDBACK}
          className="flex h-12 items-center gap-3">
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

      {status === 'authenticated' && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-foreground-tertiary">계정</h2>
          <button
            type="button"
            className="flex h-12 items-center gap-3 text-destructive"
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
