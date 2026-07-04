'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { APP_PATH } from '@/constants/app-path';
import { useCreatedChatIds } from '@/features/chats/list/hooks/use-created-chat-ids';
import { useCreatedStoryIds } from '@/features/stories/list/hooks/use-created-story-ids';
import { track } from '@/observability/analytics';

import {
  isOnboardingSeen,
  markOnboardingSeen,
} from '../utils/onboarding-storage';

export function useOnboardingDialog() {
  const router = useRouter();
  const storyIds = useCreatedStoryIds();
  const chatIds = useCreatedChatIds();
  const [isOpen, setIsOpen] = useState(false);

  // 서버 렌더링 시점(null)에는 보유 여부를 알 수 없으므로 열지 않고,
  // 클라이언트에서 "보관된 스토리·채팅이 모두 없음"이 확정됐을 때만 게이팅을 통과시킨다.
  const hasNoStories = storyIds != null && storyIds.length === 0;
  const hasNoChats = chatIds != null && chatIds.length === 0;
  const isNewVisitor = hasNoStories && hasNoChats;

  useEffect(() => {
    if (!isNewVisitor || isOnboardingSeen()) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(true);
    track('client_onboarding_viewed');
  }, [isNewVisitor]);

  const handleStartCreate = () => {
    markOnboardingSeen();
    track('client_onboarding_createButton_clicked');
    router.push(APP_PATH.CREATOR.STORY);
  };

  return { isOpen, handleStartCreate };
}
