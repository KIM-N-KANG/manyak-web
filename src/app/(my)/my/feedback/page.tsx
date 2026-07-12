import { redirect } from 'next/navigation';

import { APP_PATH } from '@/constants/app-path';

export default function LegacyMyFeedbackPage() {
  redirect(APP_PATH.MORE_FEEDBACK);
}
