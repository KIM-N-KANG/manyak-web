import type { Metadata } from 'next';

import { GeneralStoryEditEntry } from '@/features/studio/general/components/general-story-edit-entry';
import { GENERAL_STORY_EDIT_COPY } from '@/features/studio/general/constants';

export const metadata: Metadata = {
  title: GENERAL_STORY_EDIT_COPY.title,
  robots: { index: false, follow: false },
};

type StoryEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StoryEditPage({ params }: StoryEditPageProps) {
  const { id } = await params;

  return <GeneralStoryEditEntry storyId={id} />;
}
