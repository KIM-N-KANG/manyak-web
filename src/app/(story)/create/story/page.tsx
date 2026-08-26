import { permanentRedirect } from 'next/navigation';

import { APP_PATH } from '@/constants/app-path';

export default function LegacyCreateStoryPage() {
  permanentRedirect(APP_PATH.STUDIO.STORY.SIMPLE);
}
