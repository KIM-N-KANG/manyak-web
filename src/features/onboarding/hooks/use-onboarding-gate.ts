'use client';

import { useSession } from 'next-auth/react';

import { useCreatedChatIds } from '@/features/chats/_shared/hooks/use-created-chat-ids';
import { useCreatedStoryIds } from '@/features/stories/_shared/hooks/use-created-story-ids';

import {
  type OnboardingGate,
  resolveOnboardingGate,
} from '../utils/onboarding-gate';
import { isOnboardingSeen } from '../utils/onboarding-storage';

/**
 * 현재 방문자가 온보딩 노출 대상인지 판정하는 훅.
 *
 * @returns 노출 대상 여부(`pending`이면 아직 판정할 수 없음)
 */
export function useOnboardingGate(): OnboardingGate {
  const { status } = useSession();
  const storyIds = useCreatedStoryIds();
  const chatIds = useCreatedChatIds();

  return resolveOnboardingGate({
    sessionStatus: status,
    storyIds,
    chatIds,
    hasSeenOnboarding: isOnboardingSeen(),
  });
}
