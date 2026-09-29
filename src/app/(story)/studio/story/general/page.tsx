import type { Metadata } from 'next';

import { GeneralStoryCreateGate } from '@/features/studio/general/components/general-story-create-gate';
import { GENERAL_STORY_CREATE_COPY } from '@/features/studio/general/constants';

export const metadata: Metadata = {
  title: GENERAL_STORY_CREATE_COPY.title,
};

type GeneralStoryStudioPageProps = {
  searchParams: Promise<{ submissionId?: string | string[] }>;
};

export default async function GeneralStoryStudioPage({
  searchParams,
}: GeneralStoryStudioPageProps) {
  const { submissionId } = await searchParams;

  return (
    <GeneralStoryCreateGate
      submissionId={
        typeof submissionId === 'string' && submissionId
          ? submissionId
          : undefined
      }
    />
  );
}
