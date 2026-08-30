'use client';

import { useEffect, useState } from 'react';

import {
  AddTeamIcon,
  InformationCircleIcon,
  Logout03Icon,
  MailEdit01Icon,
} from '@hugeicons/core-free-icons';
import { signOut, useSession } from 'next-auth/react';

import { Label } from '@/components/ui/label';
import { APP_PATH } from '@/constants/app-path';
import { clearPendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import { resetAnalyticsUser, track } from '@/observability/analytics';

import { CreditBalanceCard } from './credit-balance-card';
import { MyMenuItem } from './my-menu-item';
import { ProfileHeader } from './profile-header';
import { ThemeMenuItem } from './theme-menu-item';

export function MyScreen() {
  const { status } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    track('client_account_viewed');
  }, []);

  const handleLogout = () => {
    setIsLoggingOut(true);
    track('client_account_logoutButton_clicked');
    resetAnalyticsUser();
    clearPendingCreationRequest();
    void signOut({ redirectTo: APP_PATH.MAIN.MY });
  };

  return (
    <main className="flex flex-1 flex-col pb-4">
      <ProfileHeader />
      <CreditBalanceCard />
      {isAuthenticated && (
        <section className="flex flex-col py-4">
          <div className="mb-2 px-4">
            <Label>이벤트</Label>
          </div>
          <MyMenuItem
            icon={AddTeamIcon}
            label="친구 초대"
            href={APP_PATH.MY_INVITE}
          />
        </section>
      )}
      <section className="flex flex-col py-4">
        <div className="mb-2 px-4">
          <Label>화면</Label>
        </div>
        <ThemeMenuItem />
      </section>
      <section className="flex flex-col py-4">
        <div className="mb-2 px-4">
          <Label>기타</Label>
        </div>
        <MyMenuItem
          icon={InformationCircleIcon}
          label="서비스 안내"
          href={APP_PATH.ABOUT}
          newTab
        />
        <MyMenuItem
          icon={MailEdit01Icon}
          label="피드백"
          href={APP_PATH.MY_FEEDBACK}
        />
      </section>
      {isAuthenticated && (
        <section className="flex flex-col py-4">
          <div className="mb-2 px-4">
            <Label>계정</Label>
          </div>
          <MyMenuItem
            icon={Logout03Icon}
            label="로그아웃"
            destructive
            onClick={handleLogout}
            loading={isLoggingOut}
          />
        </section>
      )}
    </main>
  );
}
