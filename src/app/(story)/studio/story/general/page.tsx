import type { Metadata } from 'next';

import { GeneralStoryCreateGate } from '@/features/studio/general/components/general-story-create-gate';
import { GENERAL_STORY_CREATE_COPY } from '@/features/studio/general/constants';

export const metadata: Metadata = {
  title: GENERAL_STORY_CREATE_COPY.title,
};

export default function GeneralStoryStudioPage() {
  return <GeneralStoryCreateGate />;
}
