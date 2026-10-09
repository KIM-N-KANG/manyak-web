import { BackHeader } from '@/components/layout/back-header';
import { APP_PATH } from '@/constants/app-path';
import { InviteScreen } from '@/features/my/invite/components/invite-screen';

export default function MyInvitePage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader title="친구 초대" fallbackHref={APP_PATH.MAIN.MY} />
      <main className="flex min-h-0 flex-1 scroll-fade-b flex-col overflow-y-auto overscroll-contain">
        <InviteScreen />
      </main>
    </div>
  );
}
