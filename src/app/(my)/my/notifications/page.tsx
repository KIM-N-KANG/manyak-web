import { BackHeader } from '@/components/layout/back-header';
import { APP_PATH } from '@/constants/app-path';
import { PUSH_SETTINGS_COPY } from '@/features/my/_shared/constants/push-copy';
import { NotificationSettingsScreen } from '@/features/my/notifications/components/notification-settings-screen';

export default function MyNotificationsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader
        title={PUSH_SETTINGS_COPY.title}
        fallbackHref={APP_PATH.MAIN.MY}
      />
      <NotificationSettingsScreen />
    </div>
  );
}
