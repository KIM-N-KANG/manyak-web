'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { APP_PATH } from '@/constants/app-path';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { buildLoginUrl } from '@/features/auth/_shared/utils/login-callback-url';
import { GENERAL_STORY_CREATE_COPY } from '@/features/studio/general/constants';

import { GeneralStoryCreateScreen } from './general-story-create-screen';
import { GeneralStorySubmissionEntry } from './general-story-submission-entry';

type GeneralStoryCreateGateProps = {
  /** 고쳐 다시 제출할 검수 제출본 id다. 없으면 새 제작(또는 이어서 만들기)이다. */
  submissionId?: string;
};

export function GeneralStoryCreateGate({
  submissionId,
}: GeneralStoryCreateGateProps) {
  const { isMember, isGuest } = useMemberAccess();
  const router = useRouter();

  // 등록과 이미지 업로드가 회원 전용이라 게스트는 로그인 화면으로 보내고, 로그인하면 일반 제작으로 돌아온다.
  useEffect(() => {
    if (isGuest) {
      router.replace(
        buildLoginUrl(
          submissionId
            ? APP_PATH.STUDIO.STORY.GENERAL_SUBMISSION(submissionId)
            : APP_PATH.STUDIO.STORY.GENERAL,
        ),
      );
    }
  }, [isGuest, router, submissionId]);

  if (isMember) {
    return submissionId ? (
      <GeneralStorySubmissionEntry submissionId={submissionId} />
    ) : (
      <GeneralStoryCreateScreen />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageLoadingSpinner aria-label={GENERAL_STORY_CREATE_COPY.checking} />
    </div>
  );
}
