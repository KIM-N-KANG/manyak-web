import { BackHeader } from '@/components/layout/back-header';
import { ProfileEditScreen } from '@/features/my/profile/components/profile-edit-screen';
import { PROFILE_EDIT_COPY } from '@/features/my/profile/constants';

export default function MyProfileEditPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader title={PROFILE_EDIT_COPY.headerTitle} />
      <main className="flex min-h-0 flex-1 flex-col">
        <ProfileEditScreen />
      </main>
    </div>
  );
}
