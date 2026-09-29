'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { APP_PATH } from '@/constants/app-path';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { buildLoginUrl } from '@/features/auth/_shared/utils/login-callback-url';
import { GENERAL_STORY_CREATE_COPY } from '@/features/studio/general/constants';

import { GeneralStoryCreateScreen } from './general-story-create-screen';

export function GeneralStoryCreateGate() {
  const { isMember, isGuest } = useMemberAccess();
  const router = useRouter();

  // 등록과 이미지 업로드가 회원 전용이라 게스트는 로그인 화면으로 보내고, 로그인하면 일반 제작으로 돌아온다.
  useEffect(() => {
    if (isGuest) {
      router.replace(buildLoginUrl(APP_PATH.STUDIO.STORY.GENERAL));
    }
  }, [isGuest, router]);

  if (isMember) {
    return <GeneralStoryCreateScreen />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageLoadingSpinner aria-label={GENERAL_STORY_CREATE_COPY.checking} />
    </div>
  );
}
