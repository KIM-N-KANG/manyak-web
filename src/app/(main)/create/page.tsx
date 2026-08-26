import { permanentRedirect } from 'next/navigation';

import { APP_PATH } from '@/constants/app-path';

export default function LegacyCreatePage() {
  permanentRedirect(APP_PATH.MAIN.STUDIO);
}
