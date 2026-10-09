'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useGet as useGetStorySubmission } from '@/api/generated/endpoints/story-submission-controller/story-submission-controller';
import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useGenreCatalog } from '@/features/stories/_shared/hooks/use-genre-catalog';
import {
  EMPTY_GENRE_CATALOG,
  type GenreCatalog,
} from '@/features/stories/_shared/utils/genre-catalog';
import {
  readStorySubmission,
  type StorySubmission,
} from '@/features/studio/_shared/utils/story-submission';
import { GENERAL_STORY_CREATE_COPY } from '@/features/studio/general/constants';
import { submissionToFormInitial } from '@/features/studio/general/utils/submission-form';
import { returnToMainTab } from '@/lib/return-to-main-tab';

import { GeneralStoryCreateForm } from './general-story-create-screen';

type GeneralStorySubmissionEntryProps = {
  submissionId: string;
};

export function GeneralStorySubmissionEntry({
  submissionId,
}: GeneralStorySubmissionEntryProps) {
  const router = useRouter();
  const query = useGetStorySubmission(submissionId, {
    query: { refetchOnMount: 'always', retry: false },
  });
  const genreCatalog = useGenreCatalog();
  const submission =
    query.data?.status === 200 ? readStorySubmission(query.data.data) : null;
  const canEdit =
    submission?.kind === 'CREATE' &&
    (submission.status === 'REJECTED' || submission.status === 'FAILED');
  const redirect = query.isError
    ? 'failed'
    : !query.isSuccess || canEdit
      ? null
      : submission?.kind === 'CREATE' && submission.status === 'PENDING'
        ? 'pending'
        : submission?.status === 'APPROVED' && submission.storyId
          ? `story:${submission.storyId}`
          : 'failed';

  const hasLeftRef = useRef(false);

  // 고칠 수 없는 제출본이면(검토 중·승인·조회 실패) 폼을 열지 않고 알맞은 화면으로 보낸다.
  // 개발 모드의 StrictMode가 효과를 다시 실행해도 기록을 두 번 되돌리지 않게 한 번만 떠난다.
  useEffect(() => {
    if (!redirect || hasLeftRef.current) return;

    hasLeftRef.current = true;

    if (redirect.startsWith('story:')) {
      router.replace(APP_PATH.STORY_DETAIL(redirect.slice('story:'.length)));

      return;
    }

    toast(
      redirect === 'pending'
        ? TOAST_MESSAGE.STORY_SUBMISSION_PENDING
        : TOAST_MESSAGE.STORY_SUBMISSION_LOAD_FAILED,
    );
    returnToMainTab(router, APP_PATH.MAIN.STUDIO);
  }, [redirect, router]);

  // 장르 이름을 제공 장르로 되돌리도록 장르 목록을 기다린다. 받지 못하면 모두 직접 추가한 장르로 둔다.
  if (submission && canEdit && !genreCatalog.isPending) {
    return (
      <SubmissionForm
        submission={submission}
        catalog={genreCatalog.catalog ?? EMPTY_GENRE_CATALOG}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageLoadingSpinner aria-label={GENERAL_STORY_CREATE_COPY.loading} />
    </div>
  );
}

type SubmissionFormProps = {
  submission: StorySubmission;
  catalog: GenreCatalog;
};

function SubmissionForm({ submission, catalog }: SubmissionFormProps) {
  const [initial] = useState(() =>
    submissionToFormInitial(submission.payload, catalog),
  );

  return <GeneralStoryCreateForm initial={initial} submission={submission} />;
}
