import { permanentRedirect } from 'next/navigation';

import { APP_PATH } from '@/constants/app-path';

export default function LegacyNewStoryPage() {
  permanentRedirect(APP_PATH.CREATOR.STORY);
}
