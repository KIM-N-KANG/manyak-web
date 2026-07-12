'use client';

import { useEffect } from 'react';

import {
  AddTeamIcon,
  Logout03Icon,
  MailEdit01Icon,
} from '@hugeicons/core-free-icons';
import { signOut, useSession } from 'next-auth/react';

import { Label } from '@/components/ui/label';
import { APP_PATH } from '@/constants/app-path';
import { resetAnalyticsUser, track } from '@/observability/analytics';

import { CreditBalanceCard } from './credit-balance-card';
import { MyMenuItem } from './my-menu-item';
import { ProfileHeader } from './profile-header';

export function MyPage() {
  const { status } = useSession();

  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    track('client_account_viewed');
  }, []);

  const handleLogout = () => {
    track('client_account_logoutButton_clicked');
    resetAnalyticsUser();
    void signOut({ redirectTo: APP_PATH.MAIN.MORE });
  };

  return (
    <main className="flex flex-1 flex-col pb-4">
      <ProfileHeader />
      <CreditBalanceCard />
      {isAuthenticated && (
        <section className="flex flex-col gap-2 py-4">
          <div className="px-4">
            <Label>이벤트</Label>
          </div>
          <MyMenuItem
            icon={AddTeamIcon}
            label="친구 초대"
            href={APP_PATH.MORE_INVITE}
          />
        </section>
      )}
      <section className="flex flex-col gap-2 py-4">
        <div className="px-4">
          <Label>기타</Label>
        </div>
        <MyMenuItem
          icon={MailEdit01Icon}
          label="피드백"
          href={APP_PATH.MORE_FEEDBACK}
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
