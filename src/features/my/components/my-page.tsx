'use client';

import {
  AddTeamIcon,
  Logout03Icon,
  MailEdit01Icon,
} from '@hugeicons/core-free-icons';
import { signOut, useSession } from 'next-auth/react';

import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_PATH } from '@/constants/app-path';
import { resetAnalyticsUser } from '@/observability/analytics';

import { CreditBalanceCard } from './credit-balance-card';
import { MyMenuItem } from './my-menu-item';
import { ProfileHeader } from './profile-header';

export function MyPage() {
  const { status } = useSession();

  const isAuthenticated = status === 'authenticated';
  const isSessionLoading = status === 'loading';

  const handleLogout = () => {
    resetAnalyticsUser();
    void signOut({ redirectTo: APP_PATH.MAIN.MY });
  };

  return (
    <main className="flex flex-1 flex-col pb-4">
      <ProfileHeader />

      {isSessionLoading && (
        <section className="-mt-4 mb-4 p-4 pt-0">
          <Skeleton className="h-18 rounded-lg" />
        </section>
      )}
      {isAuthenticated && <CreditBalanceCard />}

      <section className="flex flex-col gap-2 py-4">
        <div className="px-4">
          <Label>이벤트</Label>
        </div>
        <MyMenuItem
          icon={AddTeamIcon}
          label="친구 초대"
          href={APP_PATH.MY_FEEDBACK} //** 임시로 설정 */
        />
      </section>

      <section className="flex flex-col gap-2 py-4">
        <div className="px-4">
          <Label>기타</Label>
        </div>
        <MyMenuItem
          icon={MailEdit01Icon}
          label="피드백"
          href={APP_PATH.MY_FEEDBACK}
        />
      </section>

      {isAuthenticated && (
        <section className="flex flex-col gap-2 py-4">
          <div className="px-4">
            <Label>계정</Label>
          </div>
          <MyMenuItem
            icon={Logout03Icon}
            label="로그아웃"
            destructive
            onClick={handleLogout}
          />
        </section>
      )}
    </main>
  );
}
