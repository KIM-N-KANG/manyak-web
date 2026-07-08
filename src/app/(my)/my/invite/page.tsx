import { BackHeader } from '@/components/layout/back-header';
import { InviteScreen } from '@/features/my/invite/components/invite-screen';

export default function MyInvitePage() {
  return (
    <div className="flex h-svh min-h-0 flex-col">
      <BackHeader title="친구 초대" />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <InviteScreen />
      </main>
    </div>
  );
}
