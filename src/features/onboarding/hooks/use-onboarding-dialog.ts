'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { APP_PATH } from '@/constants/app-path';
import { useCreatedChatIds } from '@/features/chats/_shared/hooks/use-created-chat-ids';
import { useCreatedStoryIds } from '@/features/stories/_shared/hooks/use-created-story-ids';
import { track } from '@/observability/analytics';

import {
  isOnboardingSeen,
  markOnboardingSeen,
} from '../utils/onboarding-storage';

/**
 * 생성한 스토리와 채팅이 모두 없는 신규 방문자에게 온보딩 다이얼로그를 띄우는 훅.
 * 한 번 본 뒤에는 로컬스토리지에 기록해 다시 띄우지 않는다.
 *
 * @returns 다이얼로그 노출 여부와 생성 시작·건너뛰기 핸들러
 */
export function useOnboardingDialog() {
  const router = useRouter();
  const { status } = useSession();
  const storyIds = useCreatedStoryIds();
  const chatIds = useCreatedChatIds();
  const [isOpen, setIsOpen] = useState(false);

  const hasNoStories = storyIds != null && storyIds.length === 0;
  const hasNoChats = chatIds != null && chatIds.length === 0;
  const isNewVisitor = hasNoStories && hasNoChats;

  useEffect(() => {
    if (status !== 'unauthenticated' || !isNewVisitor || isOnboardingSeen()) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsOpen(true);
      track('client_onboarding_viewed');
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [isNewVisitor, status]);

  const handleStartCreate = () => {
    markOnboardingSeen();
    track('client_onboarding_createButton_clicked');
    router.push(APP_PATH.CREATOR.STORY);
  };

  const handleSkip = () => {
    markOnboardingSeen();
    track('client_onboarding_skipButton_clicked');
    setIsOpen(false);
  };

  return {
    isOpen: status === 'unauthenticated' && isOpen,
    handleStartCreate,
    handleSkip,
  };
}
