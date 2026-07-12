import { BackHeader } from '@/components/layout/back-header';
import { InviteScreen } from '@/features/my/invite/components/invite-screen';

export default function MoreInvitePage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader title="친구 초대" />
      <main className="flex min-h-0 flex-1 scroll-fade-b flex-col overflow-y-auto overscroll-contain">
        <InviteScreen />
      </main>
    </div>
  );
}
