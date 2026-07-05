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

  const hasNoStories = storyIds != null && storyIds.length === 0;
  const hasNoChats = chatIds != null && chatIds.length === 0;
  const isNewVisitor = hasNoStories && hasNoChats;

  useEffect(() => {
    if (!isNewVisitor || isOnboardingSeen()) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsOpen(true);
      track('client_onboarding_viewed');
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [isNewVisitor]);

  const handleStartCreate = () => {
    markOnboardingSeen();
    track('client_onboarding_createButton_clicked');
    router.push(APP_PATH.CREATOR.STORY);
  };

  return { isOpen, handleStartCreate };
}
