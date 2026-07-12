import { redirect } from 'next/navigation';

import { APP_PATH } from '@/constants/app-path';

export default function LegacyMyPage() {
  redirect(APP_PATH.MAIN.MORE);
}
