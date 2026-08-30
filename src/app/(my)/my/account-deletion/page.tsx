import { BackHeader } from '@/components/layout/back-header';
import { AccountDeletionScreen } from '@/features/my/account-deletion/components/account-deletion-screen';

export default function MyAccountDeletionPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader title="회원 탈퇴" />
      <main className="flex min-h-0 flex-1 flex-col">
        <AccountDeletionScreen />
      </main>
    </div>
  );
}
