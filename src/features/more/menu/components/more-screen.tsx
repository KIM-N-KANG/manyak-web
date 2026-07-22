'use client';

import { useEffect } from 'react';

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
import { MoreMenuItem } from './more-menu-item';
import { ProfileHeader } from './profile-header';

export function MoreScreen() {
  const { status } = useSession();

  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    track('client_account_viewed');
  }, []);

  const handleLogout = () => {
    track('client_account_logoutButton_clicked');
    resetAnalyticsUser();
    // 로그아웃하면 디바이스 ID 재발급으로 생성 복구 레코드를 서버에서 되찾을 수
    // 없고, 공용 기기에서 다음 사용자에게 제작 내용이 노출되므로 슬롯을 비운다.
    clearPendingCreationRequest();
    void signOut({ redirectTo: APP_PATH.MAIN.MORE });
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
          <MoreMenuItem
            icon={AddTeamIcon}
            label="친구 초대"
            href={APP_PATH.MORE_INVITE}
          />
        </section>
      )}
      <section className="flex flex-col py-4">
        <div className="mb-2 px-4">
          <Label>기타</Label>
        </div>
        <MoreMenuItem
          icon={InformationCircleIcon}
          label="서비스 안내"
          href={APP_PATH.MORE_ABOUT}
        />
        <MoreMenuItem
          icon={MailEdit01Icon}
          label="피드백"
          href={APP_PATH.MORE_FEEDBACK}
        />
      </section>
      {isAuthenticated && (
        <section className="flex flex-col py-4">
          <div className="mb-2 px-4">
            <Label>계정</Label>
          </div>
          <MoreMenuItem
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
