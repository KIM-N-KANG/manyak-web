import type { Metadata } from 'next';

import { NOTIFICATION_COPY } from '@/features/notifications/_shared/constants';
import { NotificationInboxScreen } from '@/features/notifications/inbox/components/notification-inbox-screen';

export const metadata: Metadata = {
  title: NOTIFICATION_COPY.title,
};

export default function NotificationsPage() {
  return <NotificationInboxScreen />;
}
