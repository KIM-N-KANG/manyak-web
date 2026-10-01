import type { Metadata } from 'next';

import { StoryModeSelectScreen } from '@/features/studio/story/components/story-mode-select-screen';
import { STORY_MODE_SELECT_COPY } from '@/features/studio/story/constants';

export const metadata: Metadata = {
  title: STORY_MODE_SELECT_COPY.title,
};

export default function StudioStoryPage() {
  return <StoryModeSelectScreen />;
}
