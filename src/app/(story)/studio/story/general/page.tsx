import type { Metadata } from 'next';

import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { BackHeader } from '@/components/layout/back-header';
import { APP_PATH } from '@/constants/app-path';
import { GENERAL_STORY_CREATE_COPY } from '@/features/studio/general/constants';

export const metadata: Metadata = {
  title: GENERAL_STORY_CREATE_COPY.title,
};

export default function GeneralStoryStudioPage() {
  return (
    <div className="flex h-full flex-col">
      <BackHeader
        title={GENERAL_STORY_CREATE_COPY.title}
        fallbackHref={APP_PATH.MAIN.STUDIO}
      />
      <EmptyListNotice>{GENERAL_STORY_CREATE_COPY.preparing}</EmptyListNotice>
    </div>
  );
}
